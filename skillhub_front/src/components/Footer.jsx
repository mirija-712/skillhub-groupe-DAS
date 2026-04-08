import { Link } from "react-router-dom";
import logoSkillhub from "../assets/logo/sk.png";
import iconFacebook from "../assets/reseaux/facebook.png";
import iconInstagram from "../assets/reseaux/instagram.png";
import iconLinkedin from "../assets/reseaux/linkedin.png";
import iconTwitter from "../assets/reseaux/twiter.png";
import "./css/Footer.css";

export default function Footer() {
  return (
    <footer className="footer-skillhub">
      <div className="footer-container">
        <div className="footer-col">
          <div className="footer-brand">
            <img src={logoSkillhub} alt="SkillHub" className="footer-logo-img" width={180} height={54} />
          </div>
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
            <a href="#facebook" aria-label="Facebook">
              <img src={iconFacebook} alt="" width={28} height={28} />
            </a>
            <a href="#instagram" aria-label="Instagram">
              <img src={iconInstagram} alt="" width={28} height={28} />
            </a>
            <a href="#linkedin" aria-label="LinkedIn">
              <img src={iconLinkedin} alt="" width={28} height={28} />
            </a>
            <a href="#twitter" aria-label="X (Twitter)">
              <img src={iconTwitter} alt="" width={28} height={28} />
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Skill-Hub — Tous droits réservés.</p>
      </div>
    </footer>
  );
}
