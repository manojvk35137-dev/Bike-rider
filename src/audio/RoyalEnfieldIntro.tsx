
import React, { useRef } from 'react';
import './RoyalEnfieldIntro.css';

type RoyalEnfieldIntroProps = {
  onStart: () => void;
  onChooseMusic: (file: File) => void;
};

export function RoyalEnfieldIntro({
  onStart,
  onChooseMusic,
}: RoyalEnfieldIntroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onChooseMusic(file);
    event.target.value = '';
  };

  return (
    <div
      className="re-intro"
      onClick={onStart}
      role="button"
      tabIndex={0}
      aria-label="Enter Bike Rider garage"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onStart();
        }
      }}
    >
      <img
        className="re-intro-image"
        src="/royal-enfield-intro.png"
        alt="Royal Enfield motorcycle at night"
        draggable={false}
      />

      <span className="re-intro-shade" aria-hidden="true" />
      <span className="re-intro-rain" aria-hidden="true" />
      <span className="re-intro-sweep" aria-hidden="true" />
      <span className="re-intro-vignette" aria-hidden="true" />

      <div
        className="re-intro-controls"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="re-intro-music-button"
          onClick={() => fileInputRef.current?.click()}
        >
          ♫ CHOOSE MUSIC
        </button>

        <input
          ref={fileInputRef}
          className="re-intro-file-input"
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
        />
      </div>

      <span className="re-intro-hint">
        TAP ANYWHERE TO ENTER GARAGE
      </span>
    </div>
  );
}
