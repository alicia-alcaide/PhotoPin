const logic = require("../../logic");
const handleErrors = require("../../middlewares/handle-errors");

module.exports = (req, res) => {
  handleErrors(async () => {
    const {
      userId,
      params: { id: pinId },
      body
    } = req;

    const pin = await logic.updatePin(userId, pinId, body);

    return res.json(pin);
  }, res);
};
