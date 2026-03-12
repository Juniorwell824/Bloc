import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./Dashboard.css";

function Dashboard({ user }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" o "favorites"
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [animatedNoteId, setAnimatedNoteId] = useState(null);
  const [toast, setToast] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 🕐 Estado para el reloj en tiempo real
  const [currentTime, setCurrentTime] = useState(new Date());

  // 👤 Género seleccionado por nota: { [noteId]: "m" | "f" }
  const [genders, setGenders] = useState({});

  // ⏱️ Intervalo que actualiza la hora cada segundo (reloj en vivo)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🌅 Saludo según hora de Ecuador — método robusto
  const getGreeting = () => {
    const ecTime = new Date(
      currentTime.toLocaleString("en-US", { timeZone: "America/Guayaquil" })
    );
    const hour = ecTime.getHours(); // 0-23, siempre correcto
    if (hour >= 6 && hour < 12)  return "buenos días";
    if (hour >= 12 && hour < 18) return "buenas tardes";
    return "buenas noches";
  };

  // 🔄 Reemplaza saludos según hora actual
  const applyGreeting = (text) => {
    const greeting = getGreeting();
    return text
      .replace(/buenas?\s+d[íi]as?/gi, greeting)
      .replace(/buenas?\s+tardes?/gi, greeting)
      .replace(/buenas?\s+noches?/gi, greeting);
  };

  // 👤 Reemplaza Estimado/Estimada según género seleccionado
  const applyGender = (text, gender) => {
    if (!gender) return text; // sin selección, no cambia nada
    if (gender === "m") {
      return text
        .replace(/estimada/gi, "Estimado")
        .replace(/querida/gi,   "Querido");
    } else {
      return text
        .replace(/estimado/gi, "Estimada")
        .replace(/querido/gi,   "Querida");
    }
  };

  // 🔀 Aplica ambas transformaciones juntas
  const applyAll = (text, noteId) => {
    const gender = genders[noteId];
    return applyGender(applyGreeting(text), gender);
  };

  const notesRef = collection(db, "users", user.uid, "notes");

  // 🔄 Cargar notas
  const loadNotes = async () => {
    const q = query(
      notesRef,
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);

    setNotes(
      snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );

    setLoading(false);
  };

  // ➕ Guardar o editar nota (CON TOAST)
  const saveNote = async () => {
    if (!text.trim()) return;

    if (editingId) {
      await updateDoc(
        doc(db, "users", user.uid, "notes", editingId),
        { text }
      );
      setEditingId(null);
    } else {
      await addDoc(notesRef, {
        text,
        favorite: false,
        createdAt: new Date()
      });
    }

    setText("");
    setShowNewNoteForm(false);

    // 🔔 TOAST: Disparar la notificación
    setToast(editingId ? "✏️ Nota actualizada" : "✅ Nota agregada");
    setTimeout(() => {
      setToast("");
    }, 2500);

    loadNotes();
  };

  // 🗑️ Eliminar nota
  const deleteNote = async (id) => {
    setDeletingId(id);

    setTimeout(async () => {
      await deleteDoc(doc(db, "users", user.uid, "notes", id));
      setDeletingId(null);
      loadNotes();
    }, 200);
  };

  // ✏️ Editar nota
  const editNote = (note) => {
    setText(note.text);
    setEditingId(note.id);
    setShowNewNoteForm(true);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadNotes();
  }, []);

  // 🔍 Buscar
  const filteredNotes = notes.filter(note =>
    note.text.toLowerCase().includes(search.toLowerCase())
  );

  // ⭐ Favorito
  const toggleFavorite = async (note) => {
    // 🔥 Actualización optimista (UI inmediata)
    setNotes(prev =>
      prev.map(n =>
        n.id === note.id ? { ...n, favorite: !n.favorite } : n
      )
    );

    // ⭐ Animación solo al marcar
    if (!note.favorite) {
      setAnimatedNoteId(note.id);
      setTimeout(() => setAnimatedNoteId(null), 600);
    }

    // 🔄 Guardar en Firebase
    await updateDoc(
      doc(db, "users", user.uid, "notes", note.id),
      { favorite: !note.favorite }
    );

    // 🔔 Activar animación solo al marcar favorita
    if (!note.favorite) {
      setAnimatedNoteId(note.id);
      setTimeout(() => setAnimatedNoteId(null), 600);
    }

    loadNotes();
  };

  const copyNote = (text) => {
    // ✅ Método 1: API moderna (requiere HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setToast("📋 Nota copiada correctamente");
        setTimeout(() => setToast(""), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      // ✅ Método 2: fallback con textarea (funciona en HTTP local)
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.top = "0";
    textarea.style.left = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      setToast("📋 Nota copiada correctamente");
    } catch {
      setToast("❌ No se pudo copiar la nota");
    }
    document.body.removeChild(textarea);
    setTimeout(() => setToast(""), 2000);
  };

  // 🔀 Ordenar: favoritas primero, luego por fecha
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    // ⭐ Favoritas SIEMPRE arriba
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }

    // 🕒 Dentro del mismo grupo → cola (antiguas primero)
    const dateA = a.createdAt?.toMillis
      ? a.createdAt.toMillis()
      : new Date(a.createdAt).getTime();

    const dateB = b.createdAt?.toMillis
      ? b.createdAt.toMillis()
      : new Date(b.createdAt).getTime();

    return dateA - dateB; // ⬅️ ANTIGUAS → NUEVAS
  });

  // Filtrar según pestaña activa
  const displayedNotes =
    activeFilter === "favorites"
      ? sortedNotes.filter(n => n.favorite)
      : sortedNotes;

  // Calcular estadísticas
  const totalChars = filteredNotes.reduce((sum, note) => sum + note.text.length, 0);
  const totalFavorites = filteredNotes.filter(n => n.favorite).length;

  return (
    <div className={`dashboard ${darkMode ? "dark" : "light"}`}>

      {/* 🕐 RELOJ FLOTANTE — esquina inferior izquierda, sigue el scroll */}
      <FloatingClock currentTime={currentTime} />

      <div className="container">

        <button
          className="btn-danger logout-btn"
          onClick={() => setShowLogoutModal(true)}
        >
          Cerrar sesión
        </button>

        <div className="header">
          <h1>📝 Notas Inteligentes</h1>
          <small>{user.email}</small>
        </div>

        {/* 🔍 Barra de búsqueda */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar en notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 📊 Estadísticas */}
        <div className="stats-container">
          <p>Mostrando {displayedNotes.length} notas {activeFilter === "all" ? "todas" : "favoritas"} ({filteredNotes.length})</p>
        </div>

        <hr className="divider" />

        {/* 📌 Filtros */}
        <div className="filters">
          <button
            className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Todas
          </button>
          <button
            className={`filter-btn ${activeFilter === "favorites" ? "active" : ""}`}
            onClick={() => setActiveFilter("favorites")}
          >
            Favoritas
          </button>
        </div>

        {/* 📊 Resumen */}
        <div className="summary">
          <p>{filteredNotes.length} notas  {totalChars} caracteres</p>
          <p>{totalFavorites} favoritas</p>
        </div>

        <hr className="divider" />

        {/* ✍️ Botones de acción */}
        <div className="action-buttons">
          <button
            className="btn-primary new-note-btn"
            onClick={() => {
              setShowNewNoteForm(!showNewNoteForm);
              if (editingId) {
                setEditingId(null);
                setText("");
              }
            }}
          >
            Nueva Nota
          </button>
        </div>

        {/* ✍️ Textarea para nueva/editar nota */}
        {showNewNoteForm && (
          <div className="note-form">
            <textarea
              rows="6"
              className="note-textarea"
              placeholder="✍️ Escribe tu nota aquí..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="form-actions">
              <button className="btn-primary" onClick={saveNote}>
                {editingId ? "Actualizar Nota" : "Guardar Nota"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowNewNoteForm(false);
                  setText("");
                  setEditingId(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* 📝 Lista de notas */}
        {loading ? (
          <p className="loading">Cargando notas...</p>
        ) : displayedNotes.length === 0 ? (
          <div className="empty-state">
            <p>No hay notas aún</p>
            <p>Crea tu primera nota haciendo clic en "Nueva Nota"</p>
          </div>
        ) : (
          <div className="notes-list">
            {displayedNotes.map(note => (
              <div
                key={note.id}
                className={`card note
                  ${note.favorite ? "favorite" : ""}
                  ${animatedNoteId === note.id ? "favorite-bump" : ""}
                  ${deletingId === note.id ? "animate-out" : ""}
               `}
              >
                <div className="note-content">
                  {/* 🌅 Aplica saludo por hora y género seleccionado */}
                  <p>{applyAll(note.text, note.id)}</p>
                  <div className="note-meta">
                    <span className="date">
                      {new Date(note.createdAt?.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* 👤 Selector de género */}
                <div style={{
                  display: "flex",
                  gap: "6px",
                  padding: "8px 12px 4px 0",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "11px", color: "#64748b", marginRight: "4px" }}>Tratamiento:</span>
                  <button
                    onClick={() => setGenders(prev => ({ ...prev, [note.id]: prev[note.id] === "m" ? null : "m" }))}
                    style={{
                      padding: "3px 12px",
                      borderRadius: "20px",
                      border: "1px solid",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderColor: genders[note.id] === "m" ? "#3b82f6" : "#334155",
                      background: genders[note.id] === "m" ? "#3b82f6" : "transparent",
                      color: genders[note.id] === "m" ? "#fff" : "#64748b",
                    }}
                  >
                    👨 Estimado
                  </button>
                  <button
                    onClick={() => setGenders(prev => ({ ...prev, [note.id]: prev[note.id] === "f" ? null : "f" }))}
                    style={{
                      padding: "3px 12px",
                      borderRadius: "20px",
                      border: "1px solid",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderColor: genders[note.id] === "f" ? "#ec4899" : "#334155",
                      background: genders[note.id] === "f" ? "#ec4899" : "transparent",
                      color: genders[note.id] === "f" ? "#fff" : "#64748b",
                    }}
                  >
                    👩 Estimada
                  </button>
                </div>

                <div className="note-actions">
                  <button className="btn-icon" onClick={() => copyNote(applyAll(note.text, note.id))} title="Copiar">
                    📋
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => toggleFavorite(note)}
                    title={note.favorite ? "Quitar favorita" : "Marcar favorita"}
                  >
                    {note.favorite ? "⭐" : "☆"}
                  </button>
                  <button className="btn-icon" onClick={() => editNote(note)} title="Editar">
                    ✏️
                  </button>
                  <button className="btn-icon" onClick={() => deleteNote(note.id)} title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🌙/☀️ Toggle modo oscuro/claro */}
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
        </button>

        {/* 🔔 TOAST: Mostrar notificación */}
        {toast && (
          <div className="toast">
            {toast}
          </div>
        )}

        {/* 🚪 MODAL DE CONFIRMACIÓN DE LOGOUT */}
        {showLogoutModal && (
          <div className="logout-overlay">
            <div className="logout-modal">
              <h3>🚪 Cerrar sesión</h3>
              <p>¿Estás seguro de que deseas cerrar sesión?</p>

              <div className="logout-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancelar
                </button>

                <button
                  className="btn-confirm"
                  onClick={() => signOut(auth)}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
// 🕐 Reloj flotante pequeño
function FloatingClock({ currentTime }) {
  const getHour = () => {
    const ecTime = new Date(
      currentTime.toLocaleString("en-US", { timeZone: "America/Guayaquil" })
    );
    return ecTime.getHours();
  };

  const getTime = () =>
    new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(currentTime);

  const getPeriod = (h) => {
    if (h >= 6  && h < 12) return { icon: "🌤️", label: "Mañana",  color: "#f59e0b", glow: "#f59e0b55" };
    if (h >= 12 && h < 18) return { icon: "☀️",  label: "Tarde",   color: "#f97316", glow: "#f9731655" };
    if (h >= 18 && h < 21) return { icon: "🌆",  label: "Noche",   color: "#818cf8", glow: "#818cf855" };
    return                        { icon: "🌙",  label: "Noche",   color: "#6366f1", glow: "#6366f155" };
  };

  const hour   = getHour();
  const period = getPeriod(hour);
  const time   = getTime();

  return (
    <div style={{
      position: "fixed",
      top: "24px",
      left: "24px",
      zIndex: 1000,
      background: "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)",
      border: `1px solid ${period.color}55`,
      borderRadius: "14px",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 14px ${period.glow}`,
      backdropFilter: "blur(10px)",
      minWidth: "160px",
      userSelect: "none",
    }}>
      {/* Icono período */}
      <div style={{ fontSize: "26px", lineHeight: 1 }}>{period.icon}</div>

      {/* Hora y etiqueta */}
      <div>
        <div style={{
          fontSize: "20px",
          fontWeight: "800",
          fontFamily: "monospace",
          color: period.color,
          letterSpacing: "2px",
          lineHeight: 1.1,
          textShadow: `0 0 10px ${period.glow}`,
        }}>
          {time}
        </div>
        <div style={{
          fontSize: "10px",
          color: "#64748b",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginTop: "2px",
        }}>
          {period.label} · Ecuador
        </div>
      </div>
    </div>
  );
}