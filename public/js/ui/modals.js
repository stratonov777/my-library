// public/js/ui/modals.js

/**
 * ===================================================================
 * | modals.js: Модуль для управления всеми модальными окнами       |
 * ===================================================================
 * * Назначение:
 * Этот файл инкапсулирует всю логику, связанную с модальными окнами:
 * - Отображение окна с детальной информацией о книге.
 * - Переключение в режим редактирования с полной формой.
 * - Обработка всех действий пользователя внутри окон (сохранение,
 * удаление, перемещение, возврат книги).
 * - Загрузка и отображение рекомендованных книг.
 */

import { state } from '../state.js';
import {
    fetchRecommendations,
    updateBook,
    deleteBook,
    moveBookLocation,
    returnBook,
} from '../api.js';
import { applyFiltersAndSearch } from '../main.js';

const detailDialog = document.getElementById('detail-dialog');
const detailContent = document.getElementById('detail-view-content');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function createTagList(items) {
    if (!items || !items.length)
        return '<p class="placeholder-inline">Нет данных</p>';
    return `<div class="tag-list">${items
        .map((item) => `<span class="tag-item">${item}</span>`)
        .join('')}</div>`;
}

// --- НОВАЯ ФУНКЦИЯ ДЛЯ КНОПКИ "ПОКАЗАТЬ ВСЁ" ---
function initializeCollapsibleText() {
    const textContainer = document.querySelector('.collapsible-text');
    if (!textContainer) return;

    // Проверяем, действительно ли текст "обрезан"
    if (textContainer.scrollHeight > textContainer.clientHeight) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-btn';
        showMoreBtn.innerText = 'Показать всё';
        textContainer.after(showMoreBtn);

        showMoreBtn.addEventListener('click', () => {
            textContainer.classList.toggle('expanded');
            if (textContainer.classList.contains('expanded')) {
                showMoreBtn.innerText = 'Скрыть';
            } else {
                showMoreBtn.innerText = 'Показать всё';
            }
        });
    }
}

// --- ОСНОВНЫЕ ФУНКЦИИ ОТОБРАЖЕНИЯ ---

/**
 * Отображает содержимое модального окна в режиме просмотра.
 * @param {Object} book - Объект книги.
 * @param {string} listType - Тип списка.
 */
function renderDetailView(book, listType) {
    // --- 1. Подготовка данных для отображения ---

    const formatMap = {
        physical: 'Физическая',
        ebook: 'Электронная',
        audiobook: 'Аудиокнига',
    };
    const formatText = formatMap[book.format] || 'Неизвестно';
    const ownedStatusText = book.isOwned
        ? 'В моей собственности'
        : 'Взята на время';

    const correctLivelibUrl = book.livelib?.url
        ? book.livelib.url.replace('/reviews-', '-')
        : '';
    const livelibBlock = book.livelib?.rating
        ? `<p><strong>LiveLib:</strong> <a href="${correctLivelibUrl}" target="_blank">${book.livelib.rating}</a></p>`
        : '';

    const coverHtml =
        (book.format === 'ebook' || book.format === 'audiobook') &&
        !book.coverImage
            ? `<div class="book-cover-placeholder detail-cover"><h3>${book.title}</h3></div>`
            : `<img src="${
                  book.coverImage ||
                  'https://via.placeholder.com/240x350.png?text=N/A'
              }" alt="Обложка" class="detail-cover">`;

    // Функция для генерации блока местоположения
    const createLocationBlock = () => {
        if (!book.isOwned || book.format !== 'physical' || !book.location)
            return '';

        const locationType =
            typeof book.location === 'object' && book.location !== null
                ? book.location.type
                : book.location;
        let locationText = '';
        let actionButton = '';

        switch (locationType) {
            case 'home':
                locationText = '<strong>Местонахождение:</strong> Дома';
                actionButton = `<button class="btn btn-secondary" id="move-location-btn">Отнести на работу</button>`;
                break;
            case 'work':
                locationText = '<strong>Местонахождение:</strong> На работе';
                actionButton = `<button class="btn btn-secondary" id="move-location-btn">Забрать домой</button>`;
                break;
            case 'lent':
                locationText = `<strong>Выдана:</strong> ${
                    book.location.to || 'не указано'
                }`;
                if (book.location.contact)
                    locationText += ` (${book.location.contact})`;
                actionButton = `<button class="btn btn-success" id="return-book-btn">Оформить возврат</button>`;
                break;
            default:
                locationText = '<strong>Местонахождение:</strong> Неизвестно';
        }
        return `<div class="detail-location-wrapper"><p>${locationText}</p>${actionButton}</div>`;
    };

    // --- 2. Сборка всего HTML в одну переменную ---

    detailContent.innerHTML = `
        <div class="detail-header">
            ${coverHtml}
            <div class="detail-header-info">
                <h2>${book.title}</h2>
                <h3>${book.author}</h3>
                <div class="detail-actions-main">
                    <button class="btn btn-danger" id="delete-btn">Удалить</button>
                    <button class="btn btn-secondary" id="edit-btn">Редактировать</button>
                    <button class="btn" id="close-detail-btn">Закрыть</button>
                </div>
            </div>
        </div>

        <div class="detail-body">
            <div class="detail-section">
                <h4>Основная информация</h4>
                <div class="detail-grid">
                    <p><strong>Формат:</strong> ${formatText}</p>
                    <p><strong>Статус владения:</strong> ${ownedStatusText}</p>
                    <p><strong>Издательство:</strong> ${
                        book.publisher || '–'
                    }</p>
                    <p><strong>Год издания:</strong> ${
                        book.publicationYear || '–'
                    }</p>
                    ${livelibBlock}
                </div>
                ${createLocationBlock()}
            </div>

            ${
                book.series?.name || book.publisherSeries
                    ? `
            <div class="detail-section">
                <h4>Серии</h4>
                ${
                    book.series?.name
                        ? `<p><strong>Авторский цикл:</strong> ${
                              book.series.name
                          } (книга #${book.series.bookNumber || '?'})</p>`
                        : ''
                }
                ${
                    book.publisherSeries
                        ? `<p><strong>Издательская серия:</strong> ${book.publisherSeries}</p>`
                        : ''
                }
            </div>`
                    : ''
            }
            
            <div class="detail-section">
                <h4>Описание и Аналитика</h4>
                <p><em>${
                    book.ai_template?.logline || 'Логлайн не указан.'
                }</em></p>
                <p><strong>Основной конфликт:</strong> ${
                    book.ai_template?.mainConflict || '–'
                }</p>
                <p><strong>Ключевые темы:</strong></p>
                ${createTagList(book.keyThemes)}
                <p><strong>Теги:</strong></p>
                ${createTagList(book.tags)}
            </div>

            <div class="detail-section">
                <h4>Моя оценка и заметки</h4>
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
        <div id="recommendations-container" class="detail-section"></div>
    `;

    // --- 3. Установка обработчиков событий ---

    const moveBtn = document.getElementById('move-location-btn');
    if (moveBtn) {
        const currentLocationType =
            typeof book.location === 'object'
                ? book.location.type
                : book.location;
        moveBtn.addEventListener('click', () =>
            handleMoveBook(book.id, currentLocationType)
        );
    }

    const returnBtn = document.getElementById('return-book-btn');
    if (returnBtn) {
        returnBtn.addEventListener('click', () => handleReturnBook(book.id));
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

    if (listType === 'library') {
        try {
            const recommendations = await fetchRecommendations(bookId);
            renderRecommendations(recommendations);
        } catch (error) {
            console.error('Ошибка при загрузке рекомендаций:', error);
            const recContainer = document.getElementById(
                'recommendations-container'
            );
            if (recContainer) {
                recContainer.innerHTML =
                    '<h4>Похожие книги</h4><p class="placeholder">Не удалось загрузить рекомендации.</p>';
            }
        }
    }
}

/**
 * Отображает блок с рекомендованными книгами.
 * @param {Array} recommendations - Массив рекомендованных книг.
 */
function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations-container');
    if (!container) return;

    let content = '<h4>Похожие книги</h4>';
    if (recommendations.length === 0) {
        content += '<p class="placeholder">Похожих книг не найдено.</p>';
    } else {
        content += `<div id="recommendations-list">`;
        recommendations.forEach((book) => {
            content += `
                <div class="recommendation-card" data-book-id="${book.id}">
                    <img src="${
                        book.coverImage ||
                        'https://via.placeholder.com/80x120.png?text=N/A'
                    }" alt="${book.title}">
                    <p class="recommendation-title">${book.title}</p>
                </div>
            `;
        });
        content += `</div>`;
    }
    container.innerHTML = content;

    // Добавляем обработчики кликов на карточки рекомендаций
    container.querySelectorAll('.recommendation-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            const recommendedBookId = parseInt(e.currentTarget.dataset.bookId);
            detailDialog.close();
            // Небольшая задержка, чтобы модальное окно успело закрыться перед открытием нового
            setTimeout(
                () => showDetailModal(recommendedBookId, 'library'),
                150
            );
        });
    });
}

function initializeEditFormLogic() {
    const formatRadios = document.querySelectorAll(
        '#edit-book-form input[name="format"]'
    );
    const locationFieldset = document.getElementById('edit-location-fieldset');
    const locationRadios = document.querySelectorAll(
        '#edit-book-form input[name="locationType"]'
    );
    const lentToFieldsContainer = document.getElementById(
        'edit-lent-to-fields-container'
    );

    const toggleVisibility = () => {
        const selectedFormat = document.querySelector(
            '#edit-book-form input[name="format"]:checked'
        ).value;
        locationFieldset.style.display =
            selectedFormat === 'physical' ? 'block' : 'none';

        const selectedLocation = document.querySelector(
            '#edit-book-form input[name="locationType"]:checked'
        ).value;
        lentToFieldsContainer.style.display =
            selectedLocation === 'lent' ? 'block' : 'none';
    };

    formatRadios.forEach((radio) =>
        radio.addEventListener('change', toggleVisibility)
    );
    locationRadios.forEach((radio) =>
        radio.addEventListener('change', toggleVisibility)
    );
}

/**
 * Отображает содержимое модального окна в режиме РЕДАКТИРОВАНИЯ.
 * @param {Object} book - Объект книги.
 * @param {string} listType - Тип списка.
 */
function renderEditView(book, listType) {
    const arrayToString = (arr) => arr?.join(', ') || '';
    const locationType =
        typeof book.location === 'object' ? book.location.type : book.location;

    detailContent.innerHTML = `
        <h3>Редактирование книги</h3>
        <form id="edit-book-form" class="edit-form-grid">
            <fieldset class="wide">
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
                <div class="form-group"><label for="edit-dateRead">Дата прочтения</label><input type="date" id="edit-dateRead" value="${
                    book.dateRead || ''
                }"></div>
            </fieldset>

            <fieldset>
                <legend>Формат и Владение</legend>
                <div class="form-group"><label>Формат</label>
                    <div class="radio-group">
                        <label><input type="radio" name="format" value="physical" ${
                            book.format === 'physical' ? 'checked' : ''
                        }> Физическая</label>
                        <label><input type="radio" name="format" value="ebook" ${
                            book.format === 'ebook' ? 'checked' : ''
                        }> Электронная</label>
                        <label><input type="radio" name="format" value="audiobook" ${
                            book.format === 'audiobook' ? 'checked' : ''
                        }> Аудиокнига</label>
                    </div>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-isOwned" name="isOwned" ${
                        book.isOwned ? 'checked' : ''
                    }> В моей собственности</label>
                </div>
            </fieldset>

            <fieldset id="edit-location-fieldset" style="display: ${
                book.format === 'physical' ? 'block' : 'none'
            }">
                <legend>Местоположение</legend>
                <div class="form-group">
                    <div class="radio-group">
                        <label><input type="radio" name="locationType" value="home" ${
                            locationType === 'home' ? 'checked' : ''
                        }> Дома</label>
                        <label><input type="radio" name="locationType" value="work" ${
                            locationType === 'work' ? 'checked' : ''
                        }> На работе</label>
                        <label><input type="radio" name="locationType" value="lent" ${
                            locationType === 'lent' ? 'checked' : ''
                        }> Дал почитать</label>
                    </div>
                </div>
                <div id="edit-lent-to-fields-container" style="display: ${
                    locationType === 'lent' ? 'block' : 'none'
                }">
                    <div class="form-group"><label for="edit-lent-to">Кому выдана</label><input type="text" id="edit-lent-to" value="${
                        book.location?.to || ''
                    }"></div>
                    <div class="form-group"><label for="edit-lent-contact">Контакт</label><input type="text" id="edit-lent-contact" value="${
                        book.location?.contact || ''
                    }"></div>
                </div>
            </fieldset>

            <fieldset class="wide">
                <legend>Библиография и LiveLib</legend>
                <div class="form-group"><label for="edit-publisher">Издательство</label><input type="text" id="edit-publisher" value="${
                    book.publisher || ''
                }"></div>
                <div class="form-group"><label for="edit-publicationYear">Год издания</label><input type="number" id="edit-publicationYear" value="${
                    book.publicationYear || ''
                }"></div>
                <div class="form-group"><label for="edit-livelib-rating">Рейтинг LiveLib</label><input type="text" id="edit-livelib-rating" value="${
                    book.livelib?.rating || ''
                }"></div>
                <div class="form-group"><label for="edit-livelib-url">URL на LiveLib</label><input type="url" id="edit-livelib-url" value="${
                    book.livelib?.url || ''
                }"></div>
            </fieldset>

            <fieldset class="wide">
                <legend>Моя оценка</legend>
                <div class="form-group"><label for="edit-rating-overall">Общая</label><input type="number" id="edit-rating-overall" value="${
                    book.rating?.overall || ''
                }"></div>
                <div class="form-group wide"><label for="edit-myNotes">Заметки</label><textarea id="edit-myNotes" rows="4">${
                    book.myNotes || ''
                }</textarea></div>
            </fieldset>
            
            <div class="detail-actions wide">
                <button type="submit" class="btn btn-success">Сохранить</button>
                <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Отмена</button>
            </div>
        </form>
    `;

    initializeEditFormLogic();

    document
        .getElementById('edit-book-form')
        .addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveChanges(book.id, book);
        });
    document
        .getElementById('cancel-edit-btn')
        .addEventListener('click', () => renderDetailView(book, listType));
}

// --- ФУНКЦИИ-ОБРАБОТЧИКИ ДЕЙСТВИЙ ---

/**
 * Собирает данные из формы редактирования и отправляет на сервер.
 * @param {number} bookId - ID сохраняемой книги.
 * @param {Object} originalBook - Исходный объект книги.
 */
async function handleSaveChanges(bookId, originalBook) {
    const updatedBook = { ...originalBook }; // Копируем исходные данные, чтобы не потерять те, что не редактируем

    // Собираем данные из формы
    updatedBook.title = document.getElementById('edit-title').value;
    updatedBook.author = document.getElementById('edit-author').value;
    updatedBook.coverImage = document.getElementById('edit-coverImage').value;
    updatedBook.dateRead = document.getElementById('edit-dateRead').value;
    updatedBook.isOwned = document.getElementById('edit-isOwned').checked;
    updatedBook.format = document.querySelector(
        '#edit-book-form input[name="format"]:checked'
    ).value;
    updatedBook.publisher = document.getElementById('edit-publisher').value;
    updatedBook.publicationYear =
        parseInt(document.getElementById('edit-publicationYear').value) || null;

    updatedBook.livelib = {
        rating:
            parseFloat(document.getElementById('edit-livelib-rating').value) ||
            null,
        url: document.getElementById('edit-livelib-url').value,
    };

    updatedBook.rating = {
        ...originalBook.rating,
        overall:
            parseInt(document.getElementById('edit-rating-overall').value) ||
            null,
    };

    updatedBook.myNotes = document.getElementById('edit-myNotes').value;

    if (updatedBook.format === 'physical' && updatedBook.isOwned) {
        const locationType = document.querySelector(
            '#edit-book-form input[name="locationType"]:checked'
        ).value;
        updatedBook.location = {
            type: locationType,
            to:
                locationType === 'lent'
                    ? document.getElementById('edit-lent-to').value
                    : null,
            contact:
                locationType === 'lent'
                    ? document.getElementById('edit-lent-contact').value
                    : null,
        };
    } else {
        updatedBook.location = null;
    }

    try {
        await updateBook(bookId, updatedBook);
        // "Умное" обновление без перезагрузки
        const bookIndex = state.allBooksData.myLibrary.findIndex(
            (b) => b.id === bookId
        );
        if (bookIndex !== -1) {
            state.allBooksData.myLibrary[bookIndex] = updatedBook;
        }
        applyFiltersAndSearch();
        renderDetailView(updatedBook, 'library');
    } catch (error) {
        console.error('Не удалось сохранить изменения:', error);
        alert('Ошибка сохранения');
    }
}

/**
 * Обрабатывает удаление книги с запросом пароля.
 * @param {number} bookId - ID удаляемой книги.
 */
async function handleDeleteBook(bookId) {
    const password = '3452'; // Как мы обсуждали, это небезопасно для реального приложения
    const userInput = prompt('Для подтверждения удаления введите пароль:');

    if (userInput === null) return; // Пользователь нажал "Отмена"

    if (userInput === password) {
        try {
            await deleteBook(bookId);
            detailDialog.close();
            location.reload();
        } catch (error) {
            console.error('Не удалось удалить книгу:', error);
            alert('Ошибка удаления');
        }
    } else {
        alert('Неверный пароль. Удаление отменено.');
    }
}

/**
 * Обрабатывает быстрое перемещение книги.
 * @param {number} bookId - ID книги.
 * @param {string} currentLocation - Текущее местоположение.
 */
async function handleMoveBook(bookId, currentLocation) {
    const newLocation = currentLocation === 'home' ? 'work' : 'home';
    try {
        // Мы используем существующую функцию из api.js, просто передаем ей новое место
        const updatedBook = await moveBookLocation(bookId, newLocation);

        // "Умное" обновление состояния
        const bookIndex = state.allBooksData.myLibrary.findIndex(
            (b) => b.id === bookId
        );
        if (bookIndex !== -1) {
            state.allBooksData.myLibrary[bookIndex] = updatedBook;
        }

        applyFiltersAndSearch(); // Обновляем главный список
        renderDetailView(updatedBook, 'library'); // Перерисовываем модальное окно
    } catch (error) {
        console.error('Не удалось переместить книгу:', error);
        alert('Ошибка перемещения');
    }
}

/**
 * Обрабатывает возврат книги.
 * @param {number} bookId - ID книги.
 */
async function handleReturnBook(bookId) {
    let returnLocation = prompt(
        'Куда вернули книгу? Введите "home" или "work":',
        'home'
    );

    if (!returnLocation) return; // Пользователь нажал "Отмена"

    returnLocation = returnLocation.toLowerCase().trim();
    if (!['home', 'work'].includes(returnLocation)) {
        alert('Некорректный ввод. Пожалуйста, введите "home" или "work".');
        return;
    }

    try {
        const updatedBook = await returnBook(bookId, returnLocation);

        const bookIndex = state.allBooksData.myLibrary.findIndex(
            (b) => b.id === bookId
        );
        if (bookIndex !== -1) {
            state.allBooksData.myLibrary[bookIndex] = updatedBook;
        }

        applyFiltersAndSearch();
        renderDetailView(updatedBook, 'library');
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}
