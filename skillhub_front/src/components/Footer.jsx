import { Link } from "react-router-dom";
import "./css/Footer.css";

export default function Footer() {
  return (
    <footer className="footer-skillhub">
      <div className="footer-container">
        <div className="footer-col">
          <h3>
            <span className="logo-icon">S</span> Skill-Hub
          </h3>
          <p>
            Apprenez, progressez et développez vos compétences grâce à notre
            plateforme moderne.
          </p>
        </div>
        <div className="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/formations">Formations</Link></li>
            <li><Link to="/connexion">Connexion</Link></li>
            <li><Link to="/inscription">Inscription</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#assistance">Assistance</a></li>
            <li><a href="#confidentialite">Confidentialité</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Suivez-nous</h4>
          <div className="socials">
            <a href="#facebook" aria-label="Facebook">f</a>
            <a href="#instagram" aria-label="Instagram">ig</a>
            <a href="#linkedin" aria-label="LinkedIn">in</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Skill-Hub — Tous droits réservés.</p>
      </div>
    </footer>
  );
}
