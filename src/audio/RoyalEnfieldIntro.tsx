import React from 'react';
import './RoyalEnfieldIntro.css';

type RoyalEnfieldIntroProps = {
  onStart: () => void;
};

export function RoyalEnfieldIntro({ onStart }: RoyalEnfieldIntroProps) {
  return (
    <button
      type="button"
      className="re-intro"
      onClick={onStart}
      aria-label="Start Bike Rider game"
    >
      <img
        className="re-intro-image"
        src="/royal-enfield-intro.png"
        alt="A cinematic Royal Enfield motorcycle at night. Tap to start the game."
        draggable={false}
      />
      <span className="re-intro-shade" aria-hidden="true" />
      <span className="re-intro-rain" aria-hidden="true" />
      <span className="re-intro-sweep" aria-hidden="true" />
      <span className="re-intro-vignette" aria-hidden="true" />
      <span className="re-intro-hint" aria-hidden="true">TAP ANYWHERE TO ENTER GARAGE</span>
    </button>
  );
}
