import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import literals from "./literals";
import logo from "../../assets/logo/icon_v2_white.png";
import "./index.css";

function Login({ lang, onLogin, error, onLangChange, onClearError }) {
  const { title, subtitle, email, password, enter } = literals[lang];

  function handleSubmit(e) {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    onLogin(username, password);
  }

  useEffect(() => {
    onClearError();
  }, []);

  const { home } = literals[lang];

  return (
    <section className="bg-login">
      <div className="uk-position-top">
        <nav className="uk-navbar-container uk-navbar-transparent medium-margin-top" data-uk-navbar>
          <ul className="uk-navbar-nav">
            <li className="uk-margin-left">
              <img src={logo} alt="logo-PhotoPin" width="60" height="60" />
            </li>
            <li className="uk-margin-left">
              <h1 className="white-title">{title}</h1>
            </li>
          </ul>
          <div className="uk-navbar-right">
            <ul className="uk-navbar-nav">
              <li className="uk-active">
                <Link to="/home">{home}</Link>
              </li>
              <li className={lang !== "en" ? "uk-active" : ""}>
                <a onClick={() => onLangChange("en")}>en</a>
              </li>
              <li className={lang !== "es" ? "uk-active" : ""}>
                <a onClick={() => onLangChange("es")}>es</a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="uk-position-center uk-card uk-card-default uk-card-body card-transparent">
        <h2 className="uk-text-center">{subtitle}</h2>
        <form className="uk-form" onSubmit={handleSubmit}>
          <div className="uk-margin">
            <div className="uk-form-controls">
              <input
                className="uk-input uk-form-width-large"
                id="form-stacked-text"
                type="email"
                name="username"
                placeholder={email}
                required
              />
            </div>
          </div>
          <div className="uk-margin">
            <div className="uk-form-controls">
              <input
                className="uk-input uk-form-width-large"
                id="form-stacked-text"
                type="password"
                name="password"
                placeholder={password}
                required
              />
            </div>
          </div>
          <button className="uk-button default-button uk-text-bold uk-width-1-1">{enter}</button>
          {error && (
            <div className="uk-margin">
              <div className="alert">
                <span className="alert-closebtn" onClick={() => onClearError()}>
                  &times;
                </span>
                {error}
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

export default Login;
