// public/js/main.js

/**
 * ===================================================================
 * | main.js: Главный управляющий файл приложения ("Дирижер")        |
 * ===================================================================
 * * Назначение:
 * Этот файл является точкой входа для всей логики фронтенда.
 * Его задачи:
 * 1. Импортировать все необходимые модули.
 * 2. Инициализировать приложение при загрузке страницы.
 * 3. Устанавливать глобальные обработчики событий, связывающие модули.
 */

import { state, updateState } from './state.js';
import { fetchAllBooks, addBook } from './api.js';
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
const authorFilter = document.getElementById('author-filter');
const genreFilter = document.getElementById('genre-filter');
const authorSeriesFilter = document.getElementById('author-series-filter');
const formatFilter = document.getElementById('format-filter');
const locationFilter = document.getElementById('location-filter');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const sidebar = document.querySelector('.sidebar');
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
    // --- Шаг 1: Определяем базовый набор книг ---
    let workingSet = [];
    if (state.activeFilter === 'my-library') {
        workingSet = [...state.allBooksData.myLibrary];
    } else if (state.activeFilter === 'to-read') {
        workingSet = state.allBooksData.myLibrary.filter(
            (book) => book.status === 'to-read'
        );
    } else if (state.activeFilter === 'wishlist') {
        workingSet = [...state.allBooksData.wishlist];
    }

    // --- Шаг 2: Последовательно применяем все фильтры ---

    // Функция-помощник для фильтрации, чтобы не дублировать код
    const applySelectFilter = (key, selectedValue) => {
        if (selectedValue !== 'all') {
            workingSet = workingSet.filter((book) => {
                if (key === 'series') {
                    return book.series?.name === selectedValue;
                }
                return book[key] === selectedValue;
            });
        }
    };

    applySelectFilter('author', authorFilter.value);
    applySelectFilter('genre', genreFilter.value);
    applySelectFilter('series', authorSeriesFilter.value);
    applySelectFilter('publisherSeries', publisherSeriesFilter.value);

    if (formatFilter.value !== 'all') {
        workingSet = workingSet.filter(
            (book) => book.format === formatFilter.value
        );
    }

    // Отдельная логика для фильтра по местоположению
    if (locationFilter.value !== 'all') {
        workingSet = workingSet.filter((book) => {
            if (book.format !== 'physical' || !book.location) return false;
            const type =
                typeof book.location === 'object'
                    ? book.location.type
                    : book.location;
            return type === locationFilter.value;
        });
    }

    // --- Шаг 3: Перерисовываем фильтры на основе отфильтрованных книг ---
    // Это и есть магия "каскадных" фильтров!
    populateFilterDropdowns(workingSet);

    // --- Шаг 4: Применяем текстовый поиск к тому, что осталось ---
    const searchQuery = searchInput.value.toLowerCase().trim();
    if (searchQuery) {
        workingSet = workingSet.filter(
            (book) =>
                book.title?.toLowerCase().includes(searchQuery) ||
                book.author?.toLowerCase().includes(searchQuery)
        );
    }

    // --- Шаг 5: Сортируем финальный результат ---
    const sortValue = sortSelect.value;
    if (sortValue !== 'default') {
        workingSet.sort((a, b) => {
            switch (sortValue) {
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'author-asc':
                    return (a.author || '').localeCompare(b.author || '');
                case 'author-desc':
                    return (b.author || '').localeCompare(a.author || '');
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

    // --- Шаг 6: Обновляем состояние и отображаем результат ---
    updateState({ currentlyDisplayedBooks: workingSet });
    displayPage(1, false);
}

// --- Инициализация и обработчики событий ---
function populateFilterDropdowns(books, forceUpdate = false) {
    // Сохраняем текущие значения, чтобы не сбрасывать выбор пользователя
    const selected = {
        author: authorFilter.value,
        genre: genreFilter.value,
        authorSeries: authorSeriesFilter.value,
        publisherSeries: publisherSeriesFilter.value,
    };

    const authors = new Set();
    const genres = new Set();
    const authorSeries = new Set();
    const publisherSeries = new Set();

    // Собираем уникальные значения из ПЕРЕДАННОГО списка книг
    books.forEach((book) => {
        if (book.author) authors.add(book.author);
        if (book.genre) genres.add(book.genre);
        if (book.series?.name) authorSeries.add(book.series.name);
        if (book.publisherSeries) publisherSeries.add(book.publisherSeries);
    });

    // Вспомогательная функция для перерисовки одного <select>
    const populate = (selectElement, items, selectedValue) => {
        selectElement.innerHTML = `<option value="all">Все</option>`; // Начинаем с чистого списка
        const sortedItems = [...items].sort((a, b) => a.localeCompare(b));
        sortedItems.forEach((item) => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
        // Восстанавливаем выбор пользователя
        if (items.has(selectedValue)) {
            selectElement.value = selectedValue;
        }
    };

    // Перерисовываем каждый фильтр
    populate(authorFilter, authors, selected.author);
    populate(genreFilter, genres, selected.genre);
    populate(authorSeriesFilter, authorSeries, selected.authorSeries);
    populate(publisherSeriesFilter, publisherSeries, selected.publisherSeries);
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
    locationFilter.addEventListener('change', applyFiltersAndSearch);
    formatFilter.addEventListener('change', applyFiltersAndSearch);

    addBookBtn.addEventListener('click', () => addDialog.showModal());
    cancelAddBtn.addEventListener('click', () => addDialog.close());

    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
    });

    addBookForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Предотвращаем стандартную отправку формы

        // --- 1. Собираем данные из всех полей ---
        const newBook = {
            // Основная информация
            title: document.getElementById('add-title').value,
            author: document.getElementById('add-author').value,
            coverImage: document.getElementById('add-coverImage').value,

            // Формат и владение
            format: document.querySelector('input[name="format"]:checked')
                .value,
            isOwned: document.getElementById('add-isOwned').checked,

            // Библиография и LiveLib
            publisher: document.getElementById('add-publisher').value,
            publicationYear:
                parseInt(
                    document.getElementById('add-publicationYear').value
                ) || null,
            livelib: {
                rating:
                    parseFloat(
                        document.getElementById('add-livelib-rating').value
                    ) || null,
                url: document.getElementById('add-livelib-url').value,
            },

            // Обнуляем поля, которые заполняются при чтении
            rating: {
                overall: null,
                plot: null,
                characters: null,
                worldBuilding: null,
                prose: null,
            },
            myNotes: '',
            dateRead: null,

            // Поля-заглушки для полной совместимости
            series: null,
            publisherSeries: '',
            genre: '',
            tags: [],
            keyThemes: [],
            ai_template: {},
        };

        // --- 2. Собираем объект location в зависимости от выбора ---
        const format = newBook.format;
        if (format === 'physical') {
            const locationType = document.querySelector(
                'input[name="locationType"]:checked'
            ).value;

            if (locationType === 'lent') {
                newBook.location = {
                    type: 'lent',
                    to: document.getElementById('add-lent-to').value,
                    contact: document.getElementById('add-lent-contact').value,
                };
            } else {
                newBook.location = {
                    type: locationType, // 'home' или 'work'
                    to: null,
                    contact: null,
                };
            }
        } else {
            newBook.location = null; // У нефизических книг нет местоположения
        }

        // --- 3. Отправляем книгу на сервер ---
        try {
            console.log('Отправляем на сервер:', newBook); // Полезно для отладки

            // Важно: мы предполагаем, что функция addBook в api.js уже исправлена
            await addBook(newBook);

            addDialog.close(); // Закрываем модальное окно
            addBookForm.reset(); // Очищаем форму

            // Простой способ обновить список - перезагрузить страницу
            // В будущем можно будет заменить на "умное" обновление
            location.reload();
        } catch (error) {
            console.error('Ошибка при добавлении книги:', error);
            alert(
                'Не удалось добавить книгу. Проверьте консоль на наличие ошибок.'
            );
        }
    });
}

document.addEventListener('click', (event) => {
    // Проверяем, открыт ли сайдбар и был ли клик вне сайдбара и не по кнопке
    if (
        sidebar.classList.contains('is-open') &&
        !sidebar.contains(event.target) &&
        event.target !== menuToggleBtn
    ) {
        sidebar.classList.remove('is-open');
    }
});

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

// --- Логика для динамической формы добавления книги ---
function initializeAddForm() {
    const formatRadios = document.querySelectorAll('input[name="format"]');
    const locationFieldset = document.getElementById('location-fieldset');
    const locationRadios = document.querySelectorAll(
        'input[name="locationType"]'
    );
    const lentToFieldsContainer = document.getElementById(
        'lent-to-fields-container'
    );

    // Скрывать/показывать блок "Местоположение" в зависимости от формата
    formatRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
            if (radio.value === 'physical') {
                locationFieldset.style.display = 'block';
            } else {
                locationFieldset.style.display = 'none';
            }
        });
    });

    // Скрывать/показывать поля для выданной книги
    locationRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
            if (radio.value === 'lent') {
                lentToFieldsContainer.style.display = 'block';
            } else {
                lentToFieldsContainer.style.display = 'none';
            }
        });
    });
}

// Вызовем эту функцию после того, как все загрузится
document.addEventListener('DOMContentLoaded', initializeAddForm);

// --- Запуск приложения ---
initApp();
