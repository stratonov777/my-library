// public/js/ui/modals.js

import { state, updateState } from '../state.js';
import {
    fetchRecommendations,
    updateBook,
    deleteBook,
    moveBookLocation,
} from '../api.js';
import { applyFiltersAndSearch } from '../main.js';

// Получаем элементы модальных окон один раз при загрузке модуля
const detailDialog = document.getElementById('detail-dialog');
const detailContent = document.getElementById('detail-view-content');

/**
 * Главная функция, которая запускает отображение модального окна с деталями.
 * @param {number} bookId - ID книги для отображения.
 * @param {string} listType - Тип списка ('library' или 'wishlist').
 */
export async function showDetailModal(bookId, listType) {
    const bookData = state.allBooksData[
        listType === 'wishlist' ? 'wishlist' : 'myLibrary'
    ].find((b) => b.id === bookId);
    if (!bookData) {
        console.error('Книга не найдена в текущем состоянии');
        return;
    }

    renderDetailView(bookData, listType);
    detailDialog.showModal();

    // После открытия окна запрашиваем и отображаем рекомендации
    if (listType === 'library') {
        try {
            const recommendations = await fetchRecommendations(bookId);
            renderRecommendations(recommendations);
        } catch (error) {
            console.error('Ошибка при загрузке рекомендаций:', error);
            const recContainer = document.getElementById(
                'recommendations-list'
            );
            if (recContainer)
                recContainer.innerHTML =
                    '<p class="placeholder">Не удалось загрузить рекомендации.</p>';
        }
    }
}

/**
 * Отображает содержимое модального окна в режиме просмотра.
 * @param {Object} book - Объект книги.
 * @param {string} listType - Тип списка.
 */
function renderDetailView(book, listType) {
    const recommendationsBlock =
        listType === 'library'
            ? `
        <div class="detail-section recommendations-section">
            <h4>Похожие книги</h4>
            <div id="recommendations-list">
                <p class="placeholder">Загрузка...</p>
            </div>
        </div>
    `
            : '';

    const formatText = book.format === 'digital' ? 'Цифровая' : 'Физическая';
    const locationText = book.location === 'work' ? 'На работе' : 'Дома';
    const moveButtonText =
        book.location === 'work' ? 'Забрать домой' : 'Отнести на работу';

    const locationBlock =
        book.format === 'physical'
            ? `
        <div class="detail-location-wrapper">
            <p><strong>Местонахождение:</strong> ${locationText}</p>
            <button class="btn btn-secondary" id="move-location-btn">${moveButtonText}</button>
        </div>`
            : '';

    const coverHtml =
        book.format === 'digital'
            ? `<div class="book-cover-placeholder detail-cover"><h3>${book.title}</h3></div>`
            : `<img src="${
                  book.coverImage ||
                  'https://via.placeholder.com/240x350.png?text=N/A'
              }" alt="Обложка" class="detail-cover">`;

    detailContent.innerHTML = `
        <div class="detail-header">
            ${coverHtml}
            <div class="detail-header-info">
                <h2>${book.title}</h2>
                <h3>${book.author}</h3>
                ${
                    book.series?.name
                        ? `<p class="series-info">${book.series.name}, книга #${book.series.bookNumber}</p>`
                        : ''
                }
                <div class="detail-actions-main">
                    <button class="btn btn-danger" id="delete-btn">Удалить</button>
                    <button class="btn btn-secondary" id="edit-btn">Редактировать</button>
                    <button class="btn btn-secondary" id="close-detail-btn">Закрыть</button>
                </div>
            </div>
        </div>
        <div class="detail-body">
            <div class="detail-section">
                <h4>Библиография</h4>
                <div class="detail-grid">
                    <p><strong>Издательство:</strong> ${
                        book.publisher || '–'
                    }</p>
                    <p><strong>Изд. серия:</strong> ${
                        book.publisherSeries || '–'
                    }</p>
                    <p><strong>Год издания:</strong> ${
                        book.publicationYear || '–'
                    }</p>
                    <p><strong>Стр:</strong> ${book.pageCount || '–'}</p>
                    <p><strong>Формат:</strong> ${formatText}</p>
                    <p><strong>Прочитана:</strong> ${book.dateRead || '–'}</p>
                </div>
                ${locationBlock}
            </div>
            <div class="detail-section">
                <h4>Аналитика</h4>
                <p><strong>Жанр:</strong> ${book.genre || '–'}</p>
                <p><strong>Ключевые темы:</strong></p>
                <div class="tag-list">${createTagList(book.keyThemes)}</div>
                <p><strong>Теги:</strong></p>
                <div class="tag-list">${createTagList(book.tags)}</div>
            </div>
            <div class="detail-section">
                <h4>Моя оценка</h4>
                <div class="detail-grid">
                    <p><strong>Общая:</strong> ⭐ ${
                        book.rating?.overall || '–'
                    }</p>
                    <p><strong>Сюжет:</strong> ${
                        book.rating?.plot || '–'
                    }/10</p>
                    <p><strong>Персонажи:</strong> ${
                        book.rating?.characters || '–'
                    }/10</p>
                    <p><strong>Мир:</strong> ${
                        book.rating?.worldBuilding || '–'
                    }/10</p>
                    <p><strong>Стиль:</strong> ${
                        book.rating?.prose || '–'
                    }/10</p>
                </div>
                <p><strong>Заметки:</strong> ${book.myNotes || '–'}</p>
            </div>
        </div>
        ${recommendationsBlock}
    `;

    // Навешиваем обработчики на кнопки
    const moveBtn = document.getElementById('move-location-btn');
    if (moveBtn) {
        moveBtn.addEventListener('click', () =>
            handleMoveBook(book.id, book.location)
        );
    }
    document
        .getElementById('edit-btn')
        .addEventListener('click', () => renderEditView(book, listType));
    document
        .getElementById('close-detail-btn')
        .addEventListener('click', () => detailDialog.close());
    document
        .getElementById('delete-btn')
        .addEventListener('click', () => handleDeleteBook(book.id));
}

/**
 * Отображает содержимое модального окна в режиме редактирования.
 * @param {Object} book - Объект книги.
 * @param {string} listType - Тип списка.
 */
function renderEditView(book, listType) {
    const arrayToString = (arr) => arr?.join(', ') || '';

    detailContent.innerHTML = `
        <h3>Редактирование книги</h3>
        <form id="edit-book-form" class="edit-form-grid">
            <fieldset>
                <legend>Основная информация</legend>
                <div class="form-group"><label for="edit-title">Название</label><input type="text" id="edit-title" value="${
                    book.title || ''
                }"></div>
                <div class="form-group"><label for="edit-author">Автор</label><input type="text" id="edit-author" value="${
                    book.author || ''
                }"></div>
                <div class="form-group"><label for="edit-coverImage">URL обложки</label><input type="text" id="edit-coverImage" value="${
                    book.coverImage || ''
                }"></div>
                <div class="form-group"><label for="edit-format">Формат</label>
                    <select id="edit-format">
                        <option value="physical" ${
                            book.format === 'physical' ? 'selected' : ''
                        }>Физическая</option>
                        <option value="digital" ${
                            book.format === 'digital' ? 'selected' : ''
                        }>Цифровая</option>
                    </select>
                </div>
                <div class="form-group"><label for="edit-location">Местоположение</label>
                    <select id="edit-location">
                        <option value="home" ${
                            book.location === 'home' ? 'selected' : ''
                        }>Дома</option>
                        <option value="work" ${
                            book.location === 'work' ? 'selected' : ''
                        }>На работе</option>
                    </select>
                </div>
                <div class="form-group"><label for="edit-dateRead">Дата прочтения</label><input type="date" id="edit-dateRead" value="${
                    book.dateRead || ''
                }"></div>
            </fieldset>
            
            <fieldset>
                <legend>Библиография</legend>
                <div class="form-group"><label for="edit-publisher">Издательство</label><input type="text" id="edit-publisher" value="${
                    book.publisher || ''
                }"></div>
                <div class="form-group"><label for="edit-publisherSeries">Издательская серия</label><input type="text" id="edit-publisherSeries" value="${
                    book.publisherSeries || ''
                }"></div>
                <div class="form-group"><label for="edit-publicationYear">Год</label><input type="number" id="edit-publicationYear" value="${
                    book.publicationYear || ''
                }"></div>
                <div class="form-group"><label for="edit-pageCount">Стр.</label><input type="number" id="edit-pageCount" value="${
                    book.pageCount || ''
                }"></div>
                <div class="form-group"><label for="edit-isbn">ISBN</label><input type="text" id="edit-isbn" value="${
                    book.isbn || ''
                }"></div>
            </fieldset>
            
            <fieldset>
                <legend>Аналитика</legend>
                <div class="form-group"><label for="edit-genre">Жанр</label><input type="text" id="edit-genre" value="${
                    book.genre || ''
                }"></div>
                <div class="form-group"><label for="edit-series-name">Авторский цикл</label><input type="text" id="edit-series-name" value="${
                    book.series?.name || ''
                }"></div>
                <div class="form-group"><label for="edit-series-number">№ в цикле</label><input type="number" id="edit-series-number" value="${
                    book.series?.bookNumber || ''
                }"></div>
                <div class="form-group wide"><label for="edit-keyThemes">Ключевые темы</label><input type="text" id="edit-keyThemes" value="${arrayToString(
                    book.keyThemes
                )}"></div>
                <div class="form-group wide"><label for="edit-tags">Теги</label><input type="text" id="edit-tags" value="${arrayToString(
                    book.tags
                )}"></div>
            </fieldset>

            <fieldset>
                <legend>Моя оценка</legend>
                <div class="form-group"><label for="edit-rating-overall">Общая (1-10)</label><input type="number" id="edit-rating-overall" value="${
                    book.rating?.overall || ''
                }"></div>
                <div class="form-group"><label for="edit-rating-plot">Сюжет</label><input type="number" id="edit-rating-plot" value="${
                    book.rating?.plot || ''
                }"></div>
                <div class="form-group"><label for="edit-rating-characters">Персонажи</label><input type="number" id="edit-rating-characters" value="${
                    book.rating?.characters || ''
                }"></div>
                <div class="form-group"><label for="edit-rating-world">Мир</label><input type="number" id="edit-rating-world" value="${
                    book.rating?.worldBuilding || ''
                }"></div>
                <div class="form-group"><label for="edit-rating-prose">Стиль</label><input type="number" id="edit-rating-prose" value="${
                    book.rating?.prose || ''
                }"></div>
                <div class="form-group wide"><label for="edit-myNotes">Заметки</label><textarea id="edit-myNotes" rows="4">${
                    book.myNotes || ''
                }</textarea></div>
            </fieldset>
            
            <div class="detail-actions wide">
                <button type="submit" class="btn btn-success" id="save-btn">Сохранить</button>
                <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Отмена</button>
            </div>
        </form>
    `;

    document
        .getElementById('edit-book-form')
        .addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveChanges(book.id);
        });
    document
        .getElementById('cancel-edit-btn')
        .addEventListener('click', () => renderDetailView(book, listType));
}

/**
 * Отображает блок с рекомендованными книгами.
 * @param {Array} recommendations - Массив рекомендованных книг.
 */
function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations-list');
    if (!container) return;
    container.innerHTML = '';
    if (recommendations.length === 0) {
        container.innerHTML =
            '<p class="placeholder">Похожих книг не найдено.</p>';
        return;
    }
    recommendations.forEach((book) => {
        const recCard = document.createElement('div');
        recCard.className = 'recommendation-card';
        recCard.innerHTML = `<img src="${
            book.coverImage || 'https://via.placeholder.com/80x120.png?text=N/A'
        }" alt="${book.title}"><p class="recommendation-title">${
            book.title
        }</p>`;
        recCard.addEventListener('click', () => {
            detailDialog.close();
            setTimeout(() => showDetailModal(book.id, 'library'), 150);
        });
        container.appendChild(recCard);
    });
}

// --- Функции-обработчики действий ---

/**
 * Собирает данные из формы редактирования и отправляет на сервер.
 * @param {number} bookId - ID сохраняемой книги.
 */
async function handleSaveChanges(bookId) {
    const stringToArray = (str) =>
        str ? str.split(',').map((item) => item.trim()) : [];
    const getIntOrNull = (id) => {
        const value = document.getElementById(id).value;
        return value ? parseInt(value, 10) : null;
    };

    const updatedBook = {
        // Собираем все данные из формы...
        // ...
    };

    try {
        await updateBook(bookId, updatedBook);
        detailDialog.close();
        // Перезапускаем приложение, чтобы обновить все данные
        // В будущем можно будет обновлять состояние локально для большей скорости
        location.reload();
    } catch (error) {
        console.error('Не удалось сохранить изменения:', error);
        alert('Ошибка сохранения');
    }
}

async function handleDeleteBook(bookId) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) return;
    try {
        await deleteBook(bookId);
        detailDialog.close();
        location.reload();
    } catch (error) {
        console.error('Не удалось удалить книгу:', error);
        alert('Ошибка удаления');
    }
}

async function handleMoveBook(bookId, currentLocation) {
    const newLocation = currentLocation === 'home' ? 'work' : 'home';
    try {
        const updatedBook = await moveBookLocation(bookId, newLocation);

        // Обновляем данные локально для мгновенного отклика
        const bookInState = state.allBooksData.myLibrary.find(
            (b) => b.id === bookId
        );
        if (bookInState) {
            bookInState.location = updatedBook.location;
        }

        applyFiltersAndSearch();
        renderDetailView(bookInState, 'library');
    } catch (error) {
        console.error('Не удалось переместить книгу:', error);
        alert('Ошибка перемещения');
    }
}

/**
 * Вспомогательная функция для создания списка тегов/тем.
 * @param {Array<string>} items - Массив строк.
 * @returns {string} HTML-строка со списком тегов.
 */
function createTagList(items) {
    if (!items || items.length === 0)
        return '<p class="placeholder-inline">Нет данных</p>';
    return items
        .map((item) => `<span class="tag-item">${item}</span>`)
        .join('');
}

// Заглушка для функции, которая будет импортирована из main.js
// Это нужно, чтобы избежать циклических зависимостей, но при этом иметь доступ к функции
export function setApplyFiltersAndSearch(fn) {
    // Эта функция будет заменена реальной при инициализации
}
