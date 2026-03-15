/**
 * Carte compacte atelier (titre, date, statut) pour le dashboard.
 */
import { memo } from "react";
import "./css/carte_atelier.css";
import formation from "../assets/logo/icons8-less-or-equal-100.png";
import done from "../assets/logo/icons8-done-94.png";
import time from "../assets/logo/icons8-time-100.png";

function Carte_Atelier({ atelier }) {
  return (
    <div className="carte-atelier">
      <img
        src={formation}
        alt=""
        className="icone-carte-atelier"
        width={28}
        height={28}
        loading="lazy"
        decoding="async"
      />
      <h3 className="titre-atelier">{atelier.titre}</h3>
      {atelier.date && (
        <p className="date-atelier">
          <img
            src={time}
            alt=""
            className="icone-date-atelier"
            width={18}
            height={18}
            loading="lazy"
            decoding="async"
          />
          {atelier.date}
        </p>
      )}
      {/* Icône selon le statut : "termine" = done, sinon = time (en cours / à venir) */}
      <span className={`statut-atelier statut-${atelier.statut}`}>
        <img
          src={atelier.statut === "termine" ? done : time}
          alt=""
          className="icone-statut-atelier"
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
        />
        {atelier.statutLabel}
      </span>
    </div>
  );
}

export default memo(Carte_Atelier);
