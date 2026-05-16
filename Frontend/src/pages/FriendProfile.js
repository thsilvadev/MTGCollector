import React from 'react';
import { useParams } from 'react-router-dom';

function FriendProfile() {
  const { id } = useParams();

  return (
    <div style={{ marginTop: '90px', padding: '32px', textAlign: 'center', color: 'var(--textColor)' }}>
      <h2>Perfil do amigo</h2>
      <p style={{ opacity: 0.5 }}>ID: {id} — em breve</p>
    </div>
  );
}

export default FriendProfile;
