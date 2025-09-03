import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AiOutlineStar, AiFillStar } from "react-icons/ai";

export default function BookFinderApp() {
  // ----- UI + Theme -----
  const [darkMode, setDarkMode] = useState(false);

  // ----- Search + Pagination -----
  const [searchType, setSearchType] = useState("title");
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const perPage = 10;

  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [showBookmarks, setShowBookmarks] = useState(false);

  // ----- Bookmarks -----
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bookmarks")) || {};
    } catch {
      return {};
    }
  });
  //   const [showBookmarks, setShowBookmarks] = useState(true);

  // ----- Trending -----
  const [trending, setTrending] = useState([]);
  const [trendingTab, setTrendingTab] = useState("daily");
  const [trendingLoading, setTrendingLoading] = useState(false);

  // ----- Modal -----
  const [selectedBook, setSelectedBook] = useState(null);

  const PLACEHOLDER_S = "https://via.placeholder.com/80x120?text=No+Cover";
  const PLACEHOLDER_M = "https://via.placeholder.com/150x220?text=No+Cover";
  const PLACEHOLDER_L = "https://via.placeholder.com/200x300?text=No+Cover";

  const imgSrc = (book, size = "M") => {
    if (book.cover_i)
      return `https://covers.openlibrary.org/b/id/${book.cover_i}-${size}.jpg`;
    if (book.cover_id)
      return `https://covers.openlibrary.org/b/id/${book.cover_id}-${size}.jpg`;
    if (book.edition_key && book.edition_key.length > 0)
      return `https://covers.openlibrary.org/b/olid/${book.edition_key[0]}-${size}.jpg`;
    return size === "L" ? PLACEHOLDER_L : PLACEHOLDER_M;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedBook(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchTrending = async (type = "daily") => {
    setTrendingLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/trending/${type}.json`);
      const data = await res.json();
      setTrending((data?.works || []).slice(0, 10));
    } catch (error) {
      console.error("Failed to load trending books", error);
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(trendingTab);
  }, [trendingTab]);

  useEffect(() => {
    fetchTrending("daily");
  }, []);

  // Go back to trending (reset everything)
  const goBackToTrending = () => {
    setBooks([]);
    setActiveQuery("");
    setPage(1);
    setQueryInput("");
    setTitleInput("");
    setAuthorInput("");
    setYearInput("");
    setSearchType("title"); // reset to default search
  };

  const fetchBooks = async () => {
    if (!activeQuery.trim()) return;
    setLoading(true);

    try {
      let url = "";
      let apiPage = Math.floor(((page - 1) * perPage) / 100) + 1;
      let startIndex = ((page - 1) * perPage) % 100;

      if (searchType === "all") {
        let parsed = {};
        try {
          parsed = JSON.parse(activeQuery);
        } catch {}
        url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
          parsed.title
        )}&author=${encodeURIComponent(
          parsed.author
        )}&first_publish_year=${encodeURIComponent(
          parsed.year
        )}&page=${apiPage}`;
      } else if (searchType === "first_publish_year") {
        const year = parseInt(activeQuery.trim());
        if (isNaN(year)) {
          toast.error("❌ Enter a valid year!");
          setBooks([]);
          setNumFound(0);
          setLoading(false);
          return;
        }
        url = `https://openlibrary.org/search.json?q=first_publish_year:${year}&page=${apiPage}`;
      } else {
        url = `https://openlibrary.org/search.json?${searchType}=${encodeURIComponent(
          activeQuery.trim()
        )}&page=${apiPage}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      let results = data.docs || [];
      if (searchType === "first_publish_year") {
        const year = parseInt(activeQuery.trim());
        results = results.filter((book) => book.first_publish_year === year);
      }

      results = results.slice(startIndex, startIndex + perPage);

      setBooks(results);
      setNumFound(data.numFound || 0);
    } catch (error) {
      toast.error("🚨 Something went wrong while fetching books.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (typeof activeQuery === "string" && activeQuery.trim()) ||
      (typeof activeQuery === "object" &&
        activeQuery.title &&
        activeQuery.author &&
        activeQuery.year)
    ) {
      fetchBooks();
    }
  }, [page, activeQuery, searchType]);

  useEffect(() => {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // ---- handleSearch ----
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchType === "all") {
      if (!titleInput.trim() || !authorInput.trim() || !yearInput.trim()) {
        toast.error("❌ Fill all fields for 'Search by All'");
        return;
      }
      setPage(1);
      setActiveQuery(
        JSON.stringify({
          title: titleInput.trim(),
          author: authorInput.trim(),
          year: yearInput.trim(),
        })
      );
    } else {
      if (!queryInput.trim()) {
        toast.error("❌ Invalid input! Please enter a search term.");
        return;
      }
      setPage(1);
      setActiveQuery(queryInput.trim());
    }
  };

  const toggleBookmark = (book) => {
    const key = book.key;
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = {
          key,
          title: book.title,
          author:
            book.author_name?.[0] ||
            book.authors?.[0]?.name ||
            "Unknown Author",
          year: book.first_publish_year || book.first_publish_date || "N/A",
          cover_i: book.cover_i || book.cover_id,
          edition_key: book.edition_key,
        };
      }
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(numFound / perPage));

  return (
    <div
      className={`min-h-screen p-8 transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"
      }`}
    >
      <ToastContainer position="top-right" autoClose={2000} />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">📚 Book Finder</h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-lg border bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-4 mb-8 justify-center"
      >
        <select
          value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value);
            setPage(1);
            setQueryInput("");
            setTitleInput("");
            setAuthorInput("");
            setYearInput("");
            setActiveQuery("");
          }}
          className={`px-4 py-3 pr-8 border rounded-lg appearance-none bg-no-repeat bg-right ${
            darkMode
              ? "bg-gray-800 border-gray-700 text-gray-200"
              : "bg-white border-gray-300 text-gray-900"
          }`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='black' d='M5.5 7l4.5 5 4.5-5z'/%3E%3C/svg%3E\")",
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "1rem",
          }}
        >
          <option value="title">Search by Title</option>
          <option value="author">Search by Author</option>
          <option value="first_publish_year">Search by Year</option>
          <option value="all">Search by All</option>
        </select>

        {searchType === "all" ? (
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <input
              type="text"
              placeholder="Enter title..."
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className={`flex-1 p-3 border rounded-lg ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <input
              type="text"
              placeholder="Enter author..."
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              className={`flex-1 p-3 border rounded-lg ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <input
              type="text"
              placeholder="Enter year..."
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className={`w-32 p-3 border rounded-lg ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>
        ) : (
          <input
            type="text"
            placeholder={`Enter ${searchType}...`}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className={`flex-1 p-3 border rounded-lg ${
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
        )}

        <button
          type="submit"
          className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Search
        </button>
      </form>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="w-12 h-12 border-4 border-indigo-600 border-dashed rounded-full animate-spin"></div>
        </div>
      )}

      {/* Trending or Search Results */}
      {!loading && books.length === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">🔥 Trending Books</h2>
          <div className="flex gap-4 mb-6">
            {["daily", "weekly", "monthly"].map((tab) => (
              <button
                key={tab}
                onClick={() => setTrendingTab(tab)}
                className={`px-4 py-2 rounded-lg transition ${
                  trendingTab === tab
                    ? "bg-indigo-600 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tab === "daily"
                  ? "Today"
                  : tab === "weekly"
                  ? "Weekly"
                  : "Monthly"}
              </button>
            ))}
          </div>

          {trendingLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-indigo-600 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {trending.map((book) => (
                <div
                  key={book.key}
                  onClick={() => setSelectedBook(book)}
                  className={`relative p-4 rounded-xl shadow-md transform hover:scale-105 hover:shadow-xl transition animate-fadeIn cursor-pointer ${
                    darkMode
                      ? "bg-gray-800 text-gray-100"
                      : "bg-white text-gray-900"
                  }`}
                >
                  <img
                    src={imgSrc(book, "M")}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER_M;
                    }}
                    alt={book.title}
                    className="w-full h-56 object-cover rounded-md"
                  />
                  <h3 className="mt-3 font-semibold text-base truncate">
                    {book.title}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {book.author_name?.[0] ||
                      book.authors?.[0]?.name ||
                      "Unknown Author"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {book.first_publish_year ||
                      book.first_publish_date ||
                      "N/A"}
                  </p>

                  {/* ⭐ Bookmark Star Bottom-Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(book);
                    }}
                    className="absolute bottom-2 right-2 text-2xl text-yellow-400 hover:text-yellow-500 transition"
                    title={
                      bookmarks[book.key]
                        ? "Remove Bookmark"
                        : "Add to Bookmark"
                    }
                  >
                    {bookmarks[book.key] ? <AiFillStar /> : <AiOutlineStar />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {!loading && books.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-4 gap-2">
            <button
              onClick={goBackToTrending}
              className={`px-4 py-2 rounded-lg transition ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-300 hover:bg-gray-400 text-gray-800"
              }`}
              title="Return to trending books"
            >
              ← Back to Trending
            </button>
            <span
              className={`text-sm ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Showing results for:{" "}
              <strong>
                {typeof activeQuery === "object"
                  ? `Title: ${activeQuery.title}, Author: ${activeQuery.author}, Year: ${activeQuery.year}`
                  : activeQuery}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.key}
                onClick={() => setSelectedBook(book)}
                className={`relative p-4 rounded-xl shadow-md transform hover:scale-105 hover:shadow-xl transition animate-fadeIn cursor-pointer ${
                  darkMode
                    ? "bg-gray-800 text-gray-100"
                    : "bg-white text-gray-900"
                }`}
              >
                <img
                  src={imgSrc(book, "M")}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = PLACEHOLDER_M;
                  }}
                  alt={book.title}
                  className="w-full h-56 object-cover rounded-md"
                />
                <h3 className="mt-3 font-semibold text-base truncate">
                  {book.title}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {book.author_name?.[0] ||
                    book.authors?.[0]?.name ||
                    "Unknown Author"}
                </p>
                <p className="text-xs text-gray-500">
                  {book.first_publish_year || book.first_publish_date || "N/A"}
                </p>

                {/* ⭐ Bookmark Star Bottom-Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(book);
                  }}
                  className="absolute bottom-2 right-2 text-2xl text-yellow-400 hover:text-yellow-500 transition"
                  title={
                    bookmarks[book.key] ? "Remove Bookmark" : "Add to Bookmark"
                  }
                >
                  {bookmarks[book.key] ? <AiFillStar /> : <AiOutlineStar />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {books.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg ${
              page === 1
                ? "opacity-50 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            Prev
          </button>

          <span
            className={`px-3 py-1 rounded ${
              darkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-lg ${
              page === totalPages
                ? "opacity-50 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Book Modal */}
      {selectedBook && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 p-4">
          <div
            className={`relative max-w-3xl w-full p-6 rounded-2xl shadow-lg ${
              darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
            }`}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 text-2xl hover:opacity-70"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Book Cover */}
              <img
                src={imgSrc(selectedBook, "L")}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER_L;
                }}
                alt={selectedBook.title}
                className="w-40 sm:w-48 h-auto rounded-lg shadow-md"
              />

              {/* Book Info */}
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{selectedBook.title}</h2>
                <p className="mb-1">
                  <strong>Authors:</strong>{" "}
                  {selectedBook.author_name?.join(", ") ||
                    selectedBook.authors?.map((a) => a.name).join(", ") ||
                    "Unknown"}
                </p>
                <p className="mb-1">
                  <strong>First published:</strong>{" "}
                  {selectedBook.first_publish_year ||
                    selectedBook.first_publish_date ||
                    "N/A"}
                </p>
                <p className="mb-3">
                  <strong>Languages:</strong>{" "}
                  {selectedBook.language?.join(", ") || "N/A"}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleBookmark(selectedBook)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {bookmarks[selectedBook.key]
                      ? "Remove Bookmark"
                      : "Bookmark"}
                  </button>
                  <a
                    href={`https://openlibrary.org${selectedBook.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg border hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    View on Open Library ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Section */}
      <div className="mt-12">
        <button
          onClick={() => setShowBookmarks(!showBookmarks)}
          className={`flex items-center gap-2 px-4 py-2 font-semibold ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          <span>⭐ Bookmarks ({Object.keys(bookmarks).length})</span>
          <span
            className={`transform transition-transform duration-300 text-blue-500 ${
              showBookmarks ? "rotate-180" : "rotate-0"
            }`}
          >
            ⮟
          </span>
        </button>

        {showBookmarks && (
          <div className="mt-4 space-y-4">
            {Object.keys(bookmarks).length === 0 ? (
              <p className="text-gray-500">No bookmarks added yet.</p>
            ) : (
              Object.values(bookmarks).map((book) => (
                <div
                  key={book.key}
                  className={`flex items-center gap-4 p-4 rounded-lg shadow-md ${
                    darkMode
                      ? "bg-gray-900 text-gray-100"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {/* Thumbnail */}
                  <img
                    src={imgSrc(book, "S")}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER_S;
                    }}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded-md"
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-sm text-gray-400">
                      {book.author} • {book.year || "N/A"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <a
                      href={`https://openlibrary.org${book.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => toggleBookmark(book)}
                      className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className={`mt-16 py-6 text-center text-sm ${
          darkMode
            ? "text-gray-400 border-t border-gray-700"
            : "text-gray-600 border-t border-gray-300"
        }`}
      >
        <p>
          Built with <span className="text-pink-500">♥</span> using the Open
          Library API. No login required.
        </p>
        <p className="mt-2">
          Tip: Combine filters (e.g., <b>Title + Author + Year</b>) for precise
          results.
        </p>
      </footer>
    </div>
  );
}
