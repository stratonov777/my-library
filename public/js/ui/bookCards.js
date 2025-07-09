// public/js/ui/bookCards.js

/**
 * ===================================================================
 * | bookCards.js: Модуль-компонент для рендеринга карточек книг     |
 * ===================================================================
 * * Назначение:
 * Этот модуль отвечает исключительно за визуальное представление книг
 * на главной странице. Он не содержит логики фильтрации или сортировки,
 * а только принимает готовый массив данных и преобразует его в HTML.
 */

import { showDetailModal } from './modals.js';

// Получаем главный контейнер для книг один раз при загрузке модуля для производительности.
const bookListContainer = document.getElementById('book-list-container');

/**
 * Отображает список книг на главной странице.
 * @param {Array<Object>} booksToRender - Массив объектов книг для отображения.
 * @param {string} listType - Тип списка ('library' или 'wishlist'), чтобы понимать, как рендерить карточку.
 * @param {boolean} [append=false] - Если true, книги добавляются в конец списка (для кнопки "Показать еще").
 * Если false, контейнер сначала очищается.
 */
export function renderBooks(booksToRender, listType, append = false) {
    // Если это не подгрузка, а полный ререндеринг, очищаем контейнер.
    if (!append) {
        bookListContainer.innerHTML = '';
    }

    // Если после всех фильтров книг не осталось, показываем информационный плейсхолдер.
    if (booksToRender.length === 0 && !append) {
        bookListContainer.innerHTML =
            '<p class="placeholder">Ничего не найдено.</p>';
        return;
    }

    // Проходим по каждой книге в массиве для создания ее карточки.
    booksToRender.forEach((book) => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        // Сохраняем ID книги и тип списка в data-атрибутах для легкого доступа.
        bookCard.dataset.bookId = book.id;
        bookCard.dataset.listType = listType;

        // --- Логика для динамических элементов карточки ---

        // 1. Создаем значок (badge) формата или местоположения.
        let badge = '';
        if (book.format === 'audiobook') {
            badge = `<div class="book-card-badge" title="Аудиокнига">🎧</div>`;
        } else if (book.format === 'ebook') {
            badge = `<div class="book-card-badge" title="Электронная книга">📱</div>`;
        } else if (book.format === 'physical' && book.location) {
            // Надежная проверка типа location (старый строковый или новый объектный формат).
            const locationType =
                typeof book.location === 'object'
                    ? book.location.type
                    : book.location;
            let icon = '❓',
                title = 'Неизвестно';
            if (locationType === 'home') {
                (icon = '🏠'), (title = 'Дома');
            }
            if (locationType === 'work') {
                (icon = '💼'), (title = 'На работе');
            }
            if (locationType === 'lent') {
                icon = '🤝';
                title = `Выдана: ${book.location.to || 'кому-то'}`;
            }
            badge = `<div class="book-card-badge" title="${title}">${icon}</div>`;
        }

        // 2. Создаем рейтинги. Используем '<span></span>' как "пустышку",
        // чтобы верстка не ломалась, если какого-то рейтинга нет.
        const livelibRating = book.livelib?.rating
            ? `<span class="book-rating livelib">LL: ${book.livelib.rating}</span>`
            : '<span></span>';
        const myRating = book.rating?.overall
            ? `<span class="book-rating my-rating">⭐ ${book.rating.overall}</span>`
            : '<span></span>';

        // 3. Выбираем, что показать: обложку или плейсхолдер.
        const coverHtml =
            (book.format === 'ebook' || book.format === 'audiobook') &&
            !book.coverImage
                ? `<div class="book-cover-placeholder"><h3>${book.title}</h3></div>`
                : `<img src="${
                      book.coverImage ||
                      'https://via.placeholder.com/240x350.png?text=No+Cover'
                  }" alt="Обложка книги ${book.title}" class="book-cover">`;

        // Собираем финальный HTML для карточки.
        bookCard.innerHTML = `
            ${coverHtml}
            <div class="book-info">
                <h2 class="book-title">${book.title}</h2>
                <p class="book-author">${book.author}</p>
                <div class="book-meta">
                    ${myRating}
                    ${badge}
                    ${livelibRating}
                </div>
            </div>
        `;

        // Добавляем обработчик клика, который вызывает модальное окно с деталями.
        bookCard.addEventListener('click', () => {
            showDetailModal(book.id, listType);
        });

        // Добавляем готовую карточку в контейнер на странице.
        bookListContainer.appendChild(bookCard);
    });
}
