const {
  models: { User, PMap, Pin, Collection }
} = require("photopin-data");
const bcrypt = require("bcrypt");
const { LogicError } = require("photopin-errors");
const validate = require("photopin-validate");

const logic = {
  /**
   * Register an user into the database
   *
   * @param {String} name The user name
   * @param {String} surname The user surname
   * @param {String} email The user email
   * @param {String} password The user password
   *
   * @throws {TypeError, RequirementError, ValueError, FormatError} if a validation error happens
   * @throws {LogicError} if the use is already registered
   *
   * @returns {String} id
   */
  registerUser(name, surname, email, password) {
    validate.arguments([
      { name: "name", value: name, type: "string", notEmpty: true },
      { name: "surname", value: surname, type: "string", notEmpty: true },
      { name: "email", value: email, type: "string", notEmpty: true },
      { name: "password", value: password, type: "string", notEmpty: true }
    ]);

    validate.email(email);

    return (async () => {
      const user = await User.findOne({ email });

      if (user) throw new LogicError(`user with email ${email} already exists`);

      const hash = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        name,
        surname,
        email,
        password: hash
      });

      return newUser.id;
    })();
  },

  /**
   * Authenticate an user to retrieve the id or throw an error if an email doesn't exists or the password not match.
   *
   * @param {String} email The user email to authenticate
   * @param {String} password The user email to match
   *
   * @returns {String} The user id
   */
  authenticateUser(email, password) {
    validate.arguments([
      { name: "email", value: email, type: "string", notEmpty: true },
      { name: "password", value: password, type: "string", notEmpty: true }
    ]);

    validate.email(email);

    return (async () => {
      const user = await User.findOne({ email });

      if (!user)
        throw new LogicError(`user with email ${email} doesn't exists`);

      if (await bcrypt.compare(password, user.password)) return user.id;
      else throw new LogicError("wrong credentials");
    })();
  },

  /**
   * Retrieve the complete user data (name, surname, email, avatar, language and )
   *
   * @param {String} userId The user id
   *
   * @returns {Object} The user data
   */
  retrieveUser(userId) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const user = await User.findById(userId)
        .select("-_id name surname email avatar language favoritePublicMap")
        .lean();

      if (!user) throw new LogicError(`user with id ${userId} doesn't exists`);

      delete user.password;

      return user;
    })();
  },

  /**
   * Update the user with new data
   *
   * @param {string} userId
   * @param {Object} data
   *
   * @throws {Error} if user not found
   * @return {Object} user data before update
   */
  updateUser(userId, data) {
    validate.arguments([
      { name: "id", value: userId, type: "string", notEmpty: true },
      { name: "data", value: data, type: "object", notEmpty: true }
    ]);

    return (async () => {
      try {
        let result = await User.findByIdAndUpdate(userId, { $set: data })
          .select("-__v  -password")
          .lean();

        result.id = result._id.toString();
        delete result._id;

        return result;
      } catch (error) {
        throw new LogicError(`user with id ${userId} doesn't exists`);
      }
    })();
  },

  /**
   * Delete user, also delete all the pins and maps that the user is the author
   *
   * @param {String} id The user id
   * @param {String} password The user password
   *
   * @return {Object} user deleted
   */
  removeUser(userId) {
    validate.arguments([
      { name: "id", value: userId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const user = await User.findById(userId);
      if (!user) throw new LogicError(`user with id ${userId} doesn't exists`);

      await Pin.deleteMany({ author: userId });

      await PMap.deleteMany({ author: userId });

      return await User.findByIdAndDelete(userId);
    })();
  },

  /**
   * Retrieve an array with the information of all maps of the user
   *
   * @param {String} userId The user id
   *
   * @returns {Array} The maps data
   */
  retrieveUserMaps(userId) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const maps = await PMap.find({ author: userId }).select("-__v").lean();

      maps.map(map => {
        map.id = map._id.toString();
        delete map._id;
      })

      if (!maps) throw new LogicError(`no maps for user with id ${userId}`);

      return maps;
    })();
  },

  /**
   * Retrieve the complete map data, with all the pins
   *
   * @param {String} userId The user id
   * @param {String} mapId The map id
   *
   * @returns {Object} The user data
   */
  retrieveUserMap(userId, mapId) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const map = await PMap.findById(mapId)
        .populate("collections.pins")
        .lean();

      if (!map) throw new LogicError(`no maps for user with id ${mapId}`);

      if (!map.isPublic && !map.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      map.id = map._id.toString();
      delete map._id;
      delete map.__v;

      map.collections.map(col => {
        col.pins.map(pin => {
          pin.id = pin._id.toString();
          delete pin._id
          pin.mapId = pin.mapId.toString()
        })
      })

      return map;
    })();
  },

  /** Create a new map
     *
     * @param {String} userId The user id
     * @param {String} title The map title
     * @param {String} description The map description
     * @param {String} coverImage The url of the map cover
     *
     * @returns {String} The id of the created map
  */
  createMap(userId, title, description, coverImage) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "title", value: title, type: "string", notEmpty: true },
      { name: "description", value: description, type: "string" },
      { name: "coverImage", value: coverImage, type: "string" }
    ]);

    return (async () => {
      const newMap = await PMap.create({
        title,
        description,
        coverImage,
        author: userId
      });
      return newMap.id;
    })();
  },


  /** Update de data of a map
     *
     * @param {String} userId The user id
     * @param {String} mapId The map id
     * @param {Object} data The data to be modified (key: value)
     *
     * @returns {Object} The map modified
  */
  updateMap(userId, mapId, data) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true },
      { name: "data", value: data, type: "object", notEmpty: true }
    ]);

    return (async () => {
      const map = await PMap.findById(mapId);

      if (!map) throw new LogicError(`no map with id ${mapId}`);

      if (!map.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      try {
        if (data.title) map.title = data.title
        if (data.description) map.description = data.description
        if (data.coverImage) map.coverImage = data.coverImage
        const result = await map.save()
        return result
      } catch (error) {
        throw new LogicError(`error updating map with id ${mapId}`)
      }
    })();
  },


  /** Create a new collection in a map
     *
     * @param {String} userId The user id
     * @param {String} mapId The map id
     * @param {string} collectionTitle The title for the new collection
     *
     * @returns {number} number the collections of the map
  */
  createCollection(userId, mapId, collectionTitle) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true },
      { name: "collectionTitle", value: collectionTitle, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const map = await PMap.findById(mapId);

      if (!map) throw new LogicError(`no maps with id ${mapId}`);

      if (!map.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      try {
        const numCol = map.collections.push({
          title: collectionTitle,
          pins: []
        });
        await map.save();
        return numCol;
      } catch (error) {
        throw new LogicError(`error creating new collection on map ${mapId}`);
      }
    })();
  },

  /** Modify the collection title
   *
   * @param {String} userId The user id
   * @param {String} mapId The map id
   * @param {string} collectionTitle The title of the collection to modify
   * @param {string} newTitle The new title
   *
   * @returns {} 
*/
  updateCollection(userId, mapId, collectionTitle, newTitle) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true },
      {
        name: "collectionTitle",
        value: collectionTitle,
        type: "string",
        notEmpty: true
      },
      { name: "newTitle", value: newTitle, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const pmap = await PMap.findById(mapId);

      if (!pmap) throw new LogicError(`no maps with id ${mapId}`);

      if (!pmap.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      const colIndex = pmap.collections.findIndex(
        col => col.title.toString() === collectionTitle
      );
      const colIndexNewTitle = pmap.collections.findIndex(
        col => col.title.toString() === newTitle
      );
      if (colIndexNewTitle > 0)
        throw new LogicError(
          `error updating, collection ${newTitle} already exist on map ${mapId}`
        );
      try {
        pmap.collections[colIndex].title = newTitle;
        await pmap.save();
      } catch (error) {
        throw new LogicError(
          `error updating collection ${collectionTitle} on map ${mapId}`
        );
      }
    })();
  },

  /** Create a new pin
     *
     * @param {String} userId The user id
     * @param {String} mapId The map id
     * @param {string} collectionTitle The title of the collection to modify
     * @param {object} newPin The new pin data
     *
     * @returns {string} id of the pin created 
  */
  createPin(userId, mapId, collectionTitle, newPin) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true },
      { name: "collectionTitle", value: collectionTitle, type: "string", notEmpty: true },
      { name: "newPin", value: newPin, type: "object", notEmpty: true }
    ]);

    return (async () => {
      let pmap
      try {
        pmap = await PMap.findById(mapId);
      } catch (error) {
        throw new LogicError(`no maps for user with id ${mapId}`);
      }

      if (!pmap) throw new LogicError(`no maps for user with id ${mapId}`);

      if (!pmap.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      const colIndex = pmap.collections.findIndex(
        col => col.title.toString() === collectionTitle.toString()
      );
      if (colIndex < 0)
        throw new LogicError(`collection ${collectionTitle} not found`);

      try {
        const pinCreated = await Pin.create({
          mapId,
          author: userId,
          title: newPin.title,
          description: newPin.description,
          urlImage: newPin.urlImage,
          bestTimeOfYear: newPin.bestTimeOfYear,
          bestTimeOfDay: newPin.bestTimeOfDay,
          photographyTips: newPin.photographyTips,
          travelInformation: newPin.travelInformation,
          coordinates: {
            latitude: newPin.coordinates.latitude,
            longitude: newPin.coordinates.longitude
          }
        });
        pmap.collections[colIndex].pins.push(pinCreated.id);
        await pmap.save();
        return pinCreated.id;
      } catch (error) {
        throw new LogicError(`error creating new pin on map ${mapId}`);
      }
    })();
  },


  /** Update the pin data
     *
     * @param {String} userId The user id
     * @param {String} pinId The pin id
     * @param {object} newPin The new pin data
     *
     * @returns {object} pin updated
  */
  async updatePin(userId, pinId, data) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "pinId", value: pinId, type: "string", notEmpty: true },
      { name: "data", value: data, type: "object", notEmpty: true }
    ]);

    const pin = await Pin.findById(pinId);

    if (!pin) throw new LogicError(`no pin with id ${pinId}`);

    if (!pin.author.equals(userId))
      throw new LogicError(`pin ${pinId} is not from user ${userId}`);

    try {
      pin.title = data.title;
      pin.description = data.description;
      pin.urlImage = data.urlImage;
      pin.bestTimeOfYear = data.bestTimeOfYear;
      pin.bestTimeOfDay = data.bestTimeOfDay;
      pin.photographyTips = data.photographyTips;
      pin.travelInformation = data.travelInformation;
      const result = await pin.save();
      return result;
    } catch (error) {
      throw new LogicError(`error updating pin with id ${pinId}`);
    }
  },



  /** delete map and all its pins
     *
     * @param {String} userId The user id
     * @param {String} mapId The map to remove
     *
     * @returns {object} map deleted
  */
  removeMap(userId, mapId) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      const map = await PMap.findById(mapId);
      if (!map) throw new LogicError(`map with id ${mapId} doesn't exists`);

      if (!map.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      await Pin.deleteMany({ mapId });

      return await PMap.findByIdAndDelete(mapId);
    })();
  },


  /** delete collection and all its pins
     *
     * @param {String} userId The user id
     * @param {String} mapId The map id
     * @param {String} collectionTitle The collection to remove
     *
     * @returns {object} map with the collection deleted
  */
  removeCollection(userId, mapId, collectionTitle) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "mapId", value: mapId, type: "string", notEmpty: true },
      {
        name: "collectionTitle",
        value: collectionTitle,
        type: "string",
        notEmpty: true
      }
    ]);

    return (async () => {
      const map = await PMap.findById(mapId);

      if (!map) throw new LogicError(`map with id ${mapId} doesn't exists`);

      if (!map.author.equals(userId))
        throw new LogicError(`map ${mapId} is not from user ${userId}`);

      const colIndex = map.collections.findIndex(
        col => col.title === collectionTitle
      );

      if (colIndex == -1)
        throw new LogicError(
          `map ${mapId} doesn't have a collection with title ${collectionTitle}`
        );

      const idsToDelete = map.collections[colIndex].pins.map(pin => pin._id);

      map.collections.splice(colIndex, 1);
      await map.save();

      await Pin.deleteMany({ _id: { $in: idsToDelete } });

      return map;
    })();
  },


  /** delete pin
     *
     * @param {String} userId The user id
     * @param {String} pinId The pin to delete
     *
     * @returns {}
  */
  removePin(userId, pinId) {
    validate.arguments([
      { name: "userId", value: userId, type: "string", notEmpty: true },
      { name: "pinId", value: pinId, type: "string", notEmpty: true }
    ]);

    return (async () => {
      let deletedPin = null;
      try {
        deletedPin = await Pin.findOneAndDelete({ _id: pinId, author: userId });
      } catch (err) {
        throw new LogicError(`Unable remove pin ${pinId} from user ${userId}`);
      }
      if (!deletedPin) {
        throw new LogicError(
          `No pin with id ${pinId} was found for user ${userId}`
        );
      }
    })();
  }
};

module.exports = logic;
