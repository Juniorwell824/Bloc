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

  // 🗑️ Limpiar todas las notas
  const clearAllNotes = async () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar todas las notas?")) {
      for (const note of notes) {
        await deleteDoc(doc(db, "users", user.uid, "notes", note.id));
      }
      loadNotes();
    }
  };

  // 💾 Guardar todas las notas (ya se guardan automáticamente, pero esta función puede usarse para forzar guardado)
  const saveAllNotes = () => {
    alert("Todas las notas han sido guardadas en Firebase ✅");
    loadNotes(); // Recargar para confirmar
  };

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

  const copyNote = async (text) => {
    try {
      await navigator.clipboard.writeText(text);

      // 🔔 Toast positivo
      setToast("📋 Nota copiada correctamente");
      setTimeout(() => {
        setToast("");
      }, 2000);

    } catch {
      setToast("❌ No se pudo copiar la nota");
      setTimeout(() => {
        setToast("");
      }, 2000);
    }
  };

  // Filtrar notas según el filtro activo
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
                  <p>{note.text}</p>
                  <div className="note-meta">
                    <span className="date">
                      {new Date(note.createdAt?.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="note-actions">
                  <button className="btn-icon" onClick={() => copyNote(note.text)} title="Copiar">
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