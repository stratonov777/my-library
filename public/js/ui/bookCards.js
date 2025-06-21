// public/js/ui/bookCards.js

import { showDetailModal } from './modals.js';

// Получаем главный контейнер для книг один раз при загрузке модуля
const bookListContainer = document.getElementById('book-list-container');

/**
 * Отображает список книг на главной странице.
 * @param {Array} booksToRender - Массив объектов книг для отображения.
 * @param {string} listType - Тип списка ('library' или 'wishlist').
 * @param {boolean} append - Если true, книги добавляются в конец списка, иначе - список очищается.
 */
export function renderBooks(booksToRender, listType, append = false) {
    // Если флаг append равен false, очищаем контейнер. Иначе - оставляем старые книги.
    if (!append) {
        bookListContainer.innerHTML = '';
    }

    // Если после всех фильтров книг не осталось и мы не добавляем новые, показываем плейсхолдер.
    if (booksToRender.length === 0 && !append) {
        bookListContainer.innerHTML =
            '<p class="placeholder">Ничего не найдено.</p>';
        return;
    }

    booksToRender.forEach((book) => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.dataset.bookId = book.id;
        bookCard.dataset.listType = listType;

        const locationIcon = book.location === 'work' ? '💼' : '🏠';
        // Значок местоположения показываем только для физических книг
        const locationBadge =
            book.format === 'physical'
                ? `<div class="book-card-location" title="Находится: ${
                      book.location === 'work' ? 'На работе' : 'Дома'
                  }">${locationIcon}</div>`
                : '';

        // Условие для отображения обложки или плейсхолдера для цифровых книг
        let coverHtml = '';
        if (book.format === 'digital') {
            coverHtml = `<div class="book-cover-placeholder"><h3>${book.title}</h3></div>`;
        } else {
            coverHtml = `<img src="${
                book.coverImage ||
                'https://via.placeholder.com/240x350.png?text=No+Cover'
            }" alt="Обложка книги ${book.title}" class="book-cover">`;
        }

        // Собираем полную карточку для книги из библиотеки
        let cardContent = `
            ${locationBadge}
            ${coverHtml}
            <div class="book-info">
                <h2 class="book-title">${book.title}</h2>
                <p class="book-author">${book.author}</p>
                <div class="book-meta">
                    <span class="book-rating">⭐ ${
                        book.rating?.overall || ''
                    }</span>
                    <span class="book-status">${
                        book.status ? translateStatus(book.status) : ''
                    }</span>
                </div>
            </div>
        `;

        // Упрощенная карточка для списка желаний
        if (listType === 'wishlist') {
            cardContent = `
                <div class="book-info wishlist-info">
                    <h2 class="book-title">${book.title}</h2>
                    <p class="book-author">${book.author}</p>
                </div>
            `;
        }

        bookCard.innerHTML = cardContent;
        bookCard.addEventListener('click', () => {
            showDetailModal(book.id, listType);
        });
        bookListContainer.appendChild(bookCard);
    });
}

/**
 * Вспомогательная функция для перевода статуса на русский язык.
 * @param {string} status - Статус на английском ('read', 'to-read', 'reading').
 * @returns {string} Переведенный статус.
 */
function translateStatus(status) {
    const statuses = {
        read: 'Прочитана',
        'to-read': 'Хочу прочитать',
        reading: 'Читаю',
    };
    return statuses[status] || 'Неизвестно';
}
