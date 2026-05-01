import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, get, onValue, push, serverTimestamp, runTransaction, onDisconnect, remove } from 'firebase/database';
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
                {(!isSpectator && !showVotes) && (
                  <div className="card-container">
                    {currentCards.map((value) => (
                      <div
                        key={value}
                        className={`card ${String(mainPlayer?.vote) === String(value) ? 'selected' : ''}`}
                        onClick={() => handleVote(value)}
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
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('scrumpoker-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [room, setRoom] = useState(null);
  const [layout, setLayout] = useState('table'); // 'table' or 'linear'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('scrumpoker-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('scrumpoker-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const roomId = window.location.pathname.substring(1) || push(ref(db, 'rooms')).key;
    if (!window.location.pathname.substring(1)) {
      window.history.replaceState({}, '', `/${roomId}`);
    }

    const roomRef = ref(db, `rooms/${roomId}`);

    const handleUserConnection = (roomData) => {
      if (user) {
        const userRef = ref(db, `rooms/${roomId}/users/${user.id}`);
        if (roomData) {
          if (!roomData.users?.[user.id]) {
            set(userRef, user);
          }
          // Ensure room has a stable creator id for ownership checks
          if (!roomData.creator) {
            const existingUserIds = roomData.users ? Object.keys(roomData.users) : [];
            const creatorId = existingUserIds.length ? existingUserIds[0] : user.id;
            set(ref(db, `rooms/${roomId}/creator`), creatorId);
          }
          onDisconnect(userRef).remove();
        } else {
          const newRoom = {
            createdAt: serverTimestamp(),
            creator: user.id,
            users: { [user.id]: user },
            cardSet: 'fibonacci', // Default card set
          };
          set(roomRef, newRoom).then(() => {
            onDisconnect(userRef).remove();
          });
        }
      }
    };

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      // If a room exists but has no users, remove it to keep the DB clean
      if (roomData && (!roomData.users || Object.keys(roomData.users).length === 0)) {
        remove(roomRef);
        setRoom(null);
        return;
      }
      setRoom(roomData ? { id: roomId, ...roomData } : null);
      handleUserConnection(roomData);
    });

    return () => {
      unsubscribe();
      if (user) {
        const userRef = ref(db, `rooms/${roomId}/users/${user.id}`);
        onDisconnect(userRef).cancel();
      }
    };
  }, [user]);

  const handleNameSubmit = (name) => {
    const newUser = {
      name,
      id: user?.id || Date.now().toString(),
    };
    setUser(newUser);
    localStorage.setItem('scrumpoker-user', JSON.stringify(newUser));
  };

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
    if (room?.users) {
        const roomRef = ref(db, `rooms/${room.id}`);
        runTransaction(roomRef, (currentRoom) => {
            if (currentRoom) {
                Object.keys(currentRoom.users).forEach(userId => {
                    currentRoom.users[userId].vote = null;
                });
                currentRoom.showVotes = false;
            }
            return currentRoom;
        });
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