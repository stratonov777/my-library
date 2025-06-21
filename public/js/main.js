// public/js/main.js

import { state, updateState } from './state.js';
import { fetchAllBooks } from './api.js';
import { renderBooks } from './ui/bookCards.js';
import { showDetailModal } from './ui/modals.js';

// --- DOM Элементы ---
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const addBookBtn = document.getElementById('add-book-btn');
const addDialog = document.getElementById('add-book-dialog');
const cancelAddBtn = document.getElementById('cancel-btn');
const addBookForm = document.getElementById('add-book-form');
// Исправленный список констант для фильтров
const authorFilter = document.getElementById('author-filter');
const genreFilter = document.getElementById('genre-filter');
const authorSeriesFilter = document.getElementById('author-series-filter');
const publisherSeriesFilter = document.getElementById(
    'publisher-series-filter'
);

// --- Логика пагинации ---

function displayPage(pageNumber, append = false) {
    updateState({ currentPage: pageNumber });
    const startIndex = (state.currentPage - 1) * state.booksPerPage;
    const endIndex = startIndex + state.booksPerPage;
    const booksForCurrentPage = state.currentlyDisplayedBooks.slice(
        startIndex,
        endIndex
    );
    const listType = state.activeFilter === 'wishlist' ? 'wishlist' : 'library';
    renderBooks(booksForCurrentPage, listType, append);
    updatePaginationUI();
}

function setupPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    const pageCount = Math.ceil(
        state.currentlyDisplayedBooks.length / state.booksPerPage
    );
    if (pageCount < 2) {
        document.getElementById('show-more-container').innerHTML = '';
        return;
    }
    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.className = 'page-btn';
        button.innerText = i;
        button.dataset.page = i;
        button.addEventListener('click', () => {
            displayPage(i, false);
        });
        paginationContainer.appendChild(button);
    }
}

function renderShowMoreButton() {
    const showMoreContainer = document.getElementById('show-more-container');
    showMoreContainer.innerHTML = '';
    const totalPages = Math.ceil(
        state.currentlyDisplayedBooks.length / state.booksPerPage
    );
    if (state.currentPage < totalPages) {
        const button = document.createElement('button');
        button.id = 'show-more-btn';
        button.innerText = 'Показать еще';
        button.addEventListener('click', () => {
            displayPage(state.currentPage + 1, true);
        });
        showMoreContainer.appendChild(button);
    }
}

function updatePaginationUI() {
    document.querySelectorAll('.page-btn').forEach((button) => {
        button.classList.toggle(
            'active',
            parseInt(button.dataset.page) === state.currentPage
        );
    });
    renderShowMoreButton();
}

// --- Главная функция фильтрации, поиска и сортировки ---
export function applyFiltersAndSearch() {
    let filteredBooks = [];

    if (state.activeFilter === 'my-library') {
        filteredBooks = [...state.allBooksData.myLibrary];
    } else if (state.activeFilter === 'to-read') {
        filteredBooks = state.allBooksData.myLibrary.filter(
            (book) => book.status === 'to-read'
        );
    } else if (state.activeFilter === 'wishlist') {
        filteredBooks = [...state.allBooksData.wishlist];
    }

    const selectedAuthor = authorFilter.value;
    const selectedGenre = genreFilter.value;
    const selectedAuthorSeries = authorSeriesFilter.value;
    const selectedPublisherSeries = publisherSeriesFilter.value;

    if (selectedAuthor !== 'all') {
        filteredBooks = filteredBooks.filter(
            (book) => book.author === selectedAuthor
        );
    }
    if (selectedGenre !== 'all') {
        filteredBooks = filteredBooks.filter(
            (book) => book.genre === selectedGenre
        );
    }
    if (selectedAuthorSeries !== 'all') {
        filteredBooks = filteredBooks.filter(
            (book) => book.series?.name === selectedAuthorSeries
        );
    }
    if (selectedPublisherSeries !== 'all') {
        filteredBooks = filteredBooks.filter(
            (book) => book.publisherSeries === selectedPublisherSeries
        );
    }

    const searchQuery = searchInput.value.toLowerCase().trim();
    if (searchQuery) {
        filteredBooks = filteredBooks.filter(
            (book) =>
                book.title.toLowerCase().includes(searchQuery) ||
                book.author.toLowerCase().includes(searchQuery)
        );
    }

    const sortValue = sortSelect.value;
    if (sortValue !== 'default') {
        filteredBooks.sort((a, b) => {
            switch (sortValue) {
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'author-asc':
                    return a.author.localeCompare(b.author);
                case 'author-desc':
                    return b.author.localeCompare(a.author);
                case 'rating-desc':
                    return (b.rating?.overall || 0) - (a.rating?.overall || 0);
                case 'rating-asc':
                    return (
                        (a.rating?.overall || 11) - (b.rating?.overall || 11)
                    );
                case 'date-desc':
                    return (
                        new Date(b.dateRead || 0) - new Date(a.dateRead || 0)
                    );
                case 'date-asc':
                    return (
                        new Date(a.dateRead || '9999-12-31') -
                        new Date(b.dateRead || '9999-12-31')
                    );
                default:
                    return 0;
            }
        });
    }

    updateState({ currentlyDisplayedBooks: filteredBooks });
    displayPage(1, false);
}

// --- Инициализация и обработчики событий ---

function populateFilterDropdowns(books) {
    const authors = new Set();
    const genres = new Set();
    const authorSeries = new Set();
    const publisherSeries = new Set();

    books.forEach((book) => {
        if (book.author) authors.add(book.author);
        if (book.genre) genres.add(book.genre);
        if (book.series && book.series.name) authorSeries.add(book.series.name);
        if (book.publisherSeries) publisherSeries.add(book.publisherSeries);
    });

    const populate = (selectElement, items) => {
        const sortedItems = [...items].sort((a, b) => a.localeCompare(b));
        sortedItems.forEach((item) => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    };

    populate(authorFilter, authors);
    populate(genreFilter, genres);
    populate(authorSeriesFilter, authorSeries);
    populate(publisherSeriesFilter, publisherSeries);
}

function setupEventListeners() {
    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            updateState({ activeFilter: button.dataset.filter });
            applyFiltersAndSearch();
        });
    });

    // Исправленный список обработчиков
    searchInput.addEventListener('input', applyFiltersAndSearch);
    sortSelect.addEventListener('change', applyFiltersAndSearch);
    authorFilter.addEventListener('change', applyFiltersAndSearch);
    genreFilter.addEventListener('change', applyFiltersAndSearch);
    authorSeriesFilter.addEventListener('change', applyFiltersAndSearch);
    publisherSeriesFilter.addEventListener('change', applyFiltersAndSearch);

    addBookBtn.addEventListener('click', () => addDialog.showModal());
    cancelAddBtn.addEventListener('click', () => addDialog.close());

    addBookForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        alert('Форма добавления будет обновлена в следующем шаге!');
    });
}

async function initApp() {
    try {
        const data = await fetchAllBooks();
        updateState({ allBooksData: data });
        populateFilterDropdowns(data.myLibrary);
        applyFiltersAndSearch();
        setupEventListeners();
    } catch (error) {
        console.error('Не удалось инициализировать приложение:', error);
        document.getElementById('book-list-container').innerHTML =
            '<p>Ошибка загрузки данных. Пожалуйста, обновите страницу.</p>';
    }
}

// --- Запуск приложения ---
initApp();
