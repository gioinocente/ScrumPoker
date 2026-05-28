import { useState, useEffect } from 'react';
import { db, authReady } from './firebase';
import { ref, set, onValue, push, serverTimestamp, onDisconnect, remove } from 'firebase/database';
import { EyeIcon, ShareIcon, ListIcon, GearIcon, SunIcon, MoonIcon } from './icons';
import './App.css';

const NamePopup = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup">
        <h2>Enter Your Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit">Join Table</button>
        </form>
      </div>
    </div>
  );
};

const LinearView = ({ users, showVotes }) => (
    <div className="linear-view">
        <ul>
            {users.map(user => (
                <li key={user.id}>
                    <span className="player-name">{user.name} {user.spectator ? '(Spec)' : ''}</span>
          <span className={`player-vote ${user.vote ? 'voted' : ''}`}>
            {showVotes ? user.vote : (user.vote ? '✅' : '')}
          </span>
                </li>
            ))}
        </ul>
    </div>
);

const cardSets = {
  fibonacci: [1, 2, 3, 5, 8, 13, 21, '❓'],
  sequential: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '❓'],
};

const PokerTable = ({ users, currentUser, handleVote, showVotes, isRoomCreator, allVoted, handleShowVotes, handleResetVotes, isSpectator, cardSet }) => {
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    const mainPlayer = users.find(u => u.id === currentUser.id);
    const currentCards = cardSets[cardSet] || cardSets.fibonacci;

    return (
        <div className="poker-table-container">
            <div className='spliter' />
            <div className="poker-table">
                <div className="table-center">
            {/* voting cards moved below table for better UX */}
                    {(isRoomCreator || allVoted) && !showVotes && (
                        <button onClick={handleShowVotes}>Show Votes</button>
                    )}
                    {showVotes && <button onClick={handleResetVotes}>Reset Votes</button>}
                </div>

                {otherUsers.map((user, index) => (
                    <div key={user.id} className={`player-seat seat-${index + 1}`}>
                        <div className="player">
                            <div className={`player-card ${user.vote ? 'voted' : ''}`}>
                                {showVotes ? user.vote : (user.vote ? '✅' : '🤔')}
                            </div>
                            <span className="player-name">{user.name} {user.spectator ? '(Spec)' : ''}</span>
                        </div>
                    </div>
                ))}

                {/* main player moved below the table for fixed stacking */}
            </div>
              {/* main player area below the table */}
              {mainPlayer && (
                <div className="main-player-area">
                  <div className="player-seat main-player-seat">
                    <div className="player">
                      <div className={`player-card ${mainPlayer.vote ? 'voted' : ''}`}>
                        {showVotes ? mainPlayer.vote : (mainPlayer.vote ? '✅' : '')}
                      </div>
                      <span className="player-name">{mainPlayer.name} {mainPlayer.spectator ? '(Spec)' : ''}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Voting cards panel below the table */}
              <div className="card-panel">
                {!isSpectator && (
                  <div className="card-container">
                    {currentCards.map((value) => (
                      <div
                        key={value}
                        className={`card ${String(mainPlayer?.vote) === String(value) ? 'selected' : ''} ${showVotes ? 'disabled' : ''}`}
                        onClick={() => !showVotes && handleVote(value)}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
        </div>
    );
};


function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [layout, setLayout] = useState('table'); // 'table' or 'linear'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('scrumpoker-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    console.log('[auth] iniciando authReady...');
    authReady
      .then((firebaseUser) => {
        console.log('[auth] authReady resolvido, uid:', firebaseUser.uid);
        const savedUser = localStorage.getItem('scrumpoker-user');
        console.log('[auth] localStorage scrumpoker-user:', savedUser);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          const synced = { ...parsed, id: firebaseUser.uid };
          if (synced.id !== parsed.id) {
            console.log('[auth] atualizando id no localStorage:', parsed.id, '->', firebaseUser.uid);
            localStorage.setItem('scrumpoker-user', JSON.stringify(synced));
          }
          setUser(synced);
        }
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error('[auth] ERRO no authReady:', err);
        setAuthLoading(false);
      });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('scrumpoker-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!user) return;
    console.log('[room] user pronto, conectando à sala. user.id:', user.id);

    const roomId = window.location.pathname.substring(1) || push(ref(db, 'rooms')).key;
    if (!window.location.pathname.substring(1)) {
      window.history.replaceState({}, '', `/${roomId}`);
    }
    console.log('[room] roomId:', roomId);

    const roomRef = ref(db, `rooms/${roomId}`);
    const userRef = ref(db, `rooms/${roomId}/users/${user.id}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      console.log('[room] onValue disparado, users:', roomData ? Object.keys(roomData.users || {}) : null);

      if (!roomData) {
        // Sala não existe — criar do zero
        console.log('[room] sala não existe, criando...');
        set(userRef, user)
          .then(() => set(ref(db, `rooms/${roomId}/creator`), user.id))
          .then(() => set(ref(db, `rooms/${roomId}/cardSet`), 'fibonacci'))
          .then(() => set(ref(db, `rooms/${roomId}/createdAt`), serverTimestamp()))
          .then(() => {
            console.log('[room] sala criada com sucesso');
            onDisconnect(userRef).remove();
          })
          .catch(err => console.error('[room] ERRO ao criar sala:', err));
        return;
      }

      // Sala existe mas sem users — cleanup (sala abandonada)
      const usersObj = roomData.users && typeof roomData.users === 'object' && !Array.isArray(roomData.users)
        ? roomData.users : null;
      if (!usersObj || Object.keys(usersObj).length === 0) {
        console.log('[room] sala sem users, removendo...');
        remove(roomRef);
        setRoom(null);
        return;
      }

      // Sala existe com users
      setRoom({ id: roomId, ...roomData });

      if (!roomData.users[user.id]) {
        console.log('[room] usuário não está na sala, adicionando...');
        set(userRef, user)
          .then(() => onDisconnect(userRef).remove())
          .catch(err => console.error('[room] ERRO ao adicionar usuário:', err));
      } else {
        onDisconnect(userRef).remove();
      }
    });

    return () => {
      unsubscribe();
      onDisconnect(userRef).cancel();
    };
  }, [user]);

  const handleNameSubmit = (name) => {
    authReady.then((firebaseUser) => {
      const newUser = {
        name,
        id: firebaseUser.uid,
      };
      setUser(newUser);
      localStorage.setItem('scrumpoker-user', JSON.stringify(newUser));
      window.location.reload();
    });
  };

  useEffect(() => {
    if (!user || !room?.resetToken) return;
    const storageKey = `scrumpoker-lastReset-${room.id}`;
    const lastSeen = localStorage.getItem(storageKey);
    if (lastSeen === String(room.resetToken)) return;
    localStorage.setItem(storageKey, String(room.resetToken));
    set(ref(db, `rooms/${room.id}/users/${user.id}/vote`), null);
  }, [room?.resetToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = (vote) => {
    if (room && user) {
      set(ref(db, `rooms/${room.id}/users/${user.id}/vote`), vote);
    }
  };

  const handleShowVotes = () => {
    if (room) {
      set(ref(db, `rooms/${room.id}/showVotes`), true);
    }
  };

  const handleResetVotes = () => {
    if (room) {
      set(ref(db, `rooms/${room.id}/resetToken`), Date.now());
      set(ref(db, `rooms/${room.id}/showVotes`), false);
    }
  };

  const handleToggleSpectator = () => {
    if (room && user) {
      const currentUser = room.users[user.id];
      set(ref(db, `rooms/${room.id}/users/${user.id}/spectator`), !currentUser?.spectator);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard!');
  };

  const toggleLayout = () => {
    setLayout(prevLayout => (prevLayout === 'table' ? 'linear' : 'table'));
  };

  const handleCardSetChange = () => {
    if (room && isRoomCreator) {
      const newCardSet = room.cardSet === 'fibonacci' ? 'sequential' : 'fibonacci';
      set(ref(db, `rooms/${room.id}/cardSet`), newCardSet);
    }
  };

  if (authLoading) {
    return <div className="App"><h1>Loading...</h1></div>;
  }

  if (!user) {
    return <NamePopup onSubmit={handleNameSubmit} />;
  }

  if (!room || !room.users) {
    return <div className="App"><h1>Loading Room...</h1></div>;
  }

  const users = Object.values(room.users);
  const currentUser = room.users[user.id];
  const isSpectator = currentUser?.spectator;
  const isRoomCreator = room.creator ? room.creator === user.id : Object.keys(room.users)[0] === user.id;
  const votes = users.map(u => u.vote).filter(v => v);
  const allVoted = users.filter(u => !u.spectator).length === votes.length;

  return (
    <div className="App">
      <header>
        <div className="header-inner">
          <h1>Scrum Poker</h1>
          <div className="header-controls">
            <button onClick={() => setDarkMode(d => !d)} className="icon-button">
              {darkMode ? <SunIcon /> : <MoonIcon />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          {isRoomCreator && (
            <button onClick={handleCardSetChange} className="icon-button">
              <GearIcon />
              <span>{room.cardSet === 'fibonacci' ? 'Fibonacci' : 'Sequential'}</span>
            </button>
          )}
          <button onClick={toggleLayout} className="icon-button">
            <ListIcon />
            <span>{layout === 'table' ? 'List View' : 'Table View'}</span>
          </button>
          <button onClick={handleCopyLink} className="icon-button">
            <ShareIcon />
            <span>Invite</span>
          </button>
          <button onClick={handleToggleSpectator} className={`icon-button ${isSpectator ? 'active' : ''}`}>
            <EyeIcon />
            <span>{isSpectator ? 'Spectator' : 'Participant'}</span>
          </button>
          </div>
        </div>
      </header>
      <main>
        {layout === 'table' ? (
          <PokerTable
            users={users}
            currentUser={currentUser}
            handleVote={handleVote}
            showVotes={room.showVotes}
            isRoomCreator={isRoomCreator}
            allVoted={allVoted}
            handleShowVotes={handleShowVotes}
            handleResetVotes={handleResetVotes}
            isSpectator={isSpectator}
            cardSet={room.cardSet || 'fibonacci'}
          />
        ) : (
          <LinearView users={users} showVotes={room.showVotes} />
        )}
      </main>
    </div>
  );
}

export default App;
