document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const bookListContainer = document.getElementById('book-list-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');
    const addBookBtn = document.getElementById('add-book-btn');
    const addDialog = document.getElementById('add-book-dialog');
    const addBookForm = document.getElementById('add-book-form');
    const cancelAddBtn = document.getElementById('cancel-btn');
    const detailDialog = document.getElementById('detail-dialog');
    const detailContent = document.getElementById('detail-view-content');
    const sortSelect = document.getElementById('sort-select');

    let allBooksData = { myLibrary: [], wishlist: [] };
    let activeFilter = 'my-library';

    const booksPerPage = 15; // Сколько книг показывать на одной странице
    let currentPage = 1; // Текущая страница
    let currentlyDisplayedBooks = []; // Массив для хранения отфильтрованных и отсортированных книг

    // --- ФУНКЦИЯ ОТОБРАЖЕНИЯ КНИГ НА ГЛАВНОЙ ---
    function renderBooks(booksToRender, listType) {
        bookListContainer.innerHTML = '';
        if (booksToRender.length === 0) {
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
            const locationBadge =
                book.format === 'physical'
                    ? `<div class="book-card-location" title="Находится: ${
                          book.location === 'work' ? 'На работе' : 'Дома'
                      }">${locationIcon}</div>`
                    : '';

            // --- НОВОЕ: Условие для отображения обложки или плейсхолдера ---
            let coverHtml = '';
            if (book.format === 'digital') {
                coverHtml = `<div class="book-cover-placeholder"><h3>${book.title}</h3></div>`;
            } else {
                coverHtml = `<img src="${
                    book.coverImage ||
                    'https://via.placeholder.com/240x350.png?text=No+Cover'
                }" alt="Обложка книги ${book.title}" class="book-cover">`;
            }

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

    function updatePaginationUI() {
        // Обновляем активную кнопку пагинации
        document.querySelectorAll('.page-btn').forEach((button) => {
            button.classList.toggle(
                'active',
                parseInt(button.dataset.page) === currentPage
            );
        });
        // Перерисовываем кнопку "Показать еще"
        renderShowMoreButton();
    }

    // НОВАЯ ФУНКЦИЯ для быстрого перемещения
    async function moveBook(bookId, currentLocation) {
        const newLocation = currentLocation === 'home' ? 'work' : 'home';
        try {
            const response = await fetch(`/api/books/${bookId}/location`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: newLocation }),
            });
            if (!response.ok) throw new Error('Ошибка перемещения');

            // Обновляем данные локально, чтобы не перезагружать все книги с сервера
            const bookInState = allBooksData.myLibrary.find(
                (b) => b.id === bookId
            );
            if (bookInState) {
                bookInState.location = newLocation;
            }

            // Перерисовываем интерфейс
            applyFiltersAndSearch(); // Перерисовываем главный список
            renderDetailView(bookInState, 'library'); // Обновляем модальное окно
        } catch (error) {
            console.error('Не удалось переместить книгу:', error);
            alert('Ошибка перемещения');
        }
    }

    // НОВАЯ ФУНКЦИЯ: Отображает книги для текущей страницы
    function displayPage(pageNumber, append = false) {
        currentPage = pageNumber;
        const startIndex = (currentPage - 1) * booksPerPage;
        const endIndex = startIndex + booksPerPage;

        const booksForCurrentPage = currentlyDisplayedBooks.slice(
            startIndex,
            endIndex
        );
        const listType = activeFilter === 'wishlist' ? 'wishlist' : 'library';

        // Передаем флаг append в renderBooks
        renderBooks(booksForCurrentPage, listType, append);

        // Обновляем состояние кнопок пагинации и "Показать еще"
        updatePaginationUI();
    }

    // НОВАЯ ФУНКЦИЯ: Создает кнопки пагинации
    function setupPagination() {
        const paginationContainer = document.getElementById(
            'pagination-container'
        );
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(
            currentlyDisplayedBooks.length / booksPerPage
        );

        if (pageCount < 2) return;

        for (let i = 1; i <= pageCount; i++) {
            const button = document.createElement('button');
            button.className = 'page-btn';
            button.innerText = i;
            button.dataset.page = i;
            button.addEventListener('click', () => {
                // Клик по номеру страницы всегда ЗАМЕНЯЕТ контент
                displayPage(i, false);
            });
            paginationContainer.appendChild(button);
        }
    }

    // НОВАЯ ФУНКЦИЯ: Создает и управляет кнопкой "Показать еще"
    function renderShowMoreButton() {
        const showMoreContainer = document.getElementById(
            'show-more-container'
        );
        showMoreContainer.innerHTML = ''; // Очищаем контейнер

        const totalPages = Math.ceil(
            currentlyDisplayedBooks.length / booksPerPage
        );

        if (currentPage < totalPages) {
            const button = document.createElement('button');
            button.id = 'show-more-btn';
            button.innerText = 'Показать еще';
            button.addEventListener('click', () => {
                // При клике загружаем следующую страницу ВДОБАВОК к текущим
                displayPage(currentPage + 1, true);
            });
            showMoreContainer.appendChild(button);
        }
    }

    // --- ФУНКЦИЯ ФИЛЬТРАЦИИ И ПОИСКА ---
    function applyFiltersAndSearch() {
        let filteredBooks = [];

        // 1. Фильтруем по статусу
        if (activeFilter === 'my-library') {
            filteredBooks = [...allBooksData.myLibrary];
        } else if (activeFilter === 'to-read') {
            filteredBooks = allBooksData.myLibrary.filter(
                (book) => book.status === 'to-read'
            );
        } else if (activeFilter === 'wishlist') {
            filteredBooks = [...allBooksData.wishlist];
        }

        // 2. Фильтруем по поисковому запросу
        const searchQuery = searchInput.value.toLowerCase().trim();
        if (searchQuery) {
            filteredBooks = filteredBooks.filter(
                (book) =>
                    book.title.toLowerCase().includes(searchQuery) ||
                    book.author.toLowerCase().includes(searchQuery)
            );
        }

        // 3. Сортируем
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
                        return (
                            (b.rating?.overall || 0) - (a.rating?.overall || 0)
                        );
                    case 'rating-asc':
                        return (
                            (a.rating?.overall || 11) -
                            (b.rating?.overall || 11)
                        );
                    default:
                        return 0;
                }
            });
        }

        // 4. Сохраняем финальный список и настраиваем пагинацию
        currentlyDisplayedBooks = filteredBooks;
        currentPage = 1; // Всегда сбрасываем на первую страницу при новом поиске/фильтре

        setupPagination();
        // ВАЖНО: при новом поиске/фильтре всегда отображаем первую страницу, ЗАМЕНЯЯ контент
        displayPage(currentPage, false);
    }

    // --- ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ДЕТАЛЕЙ ---

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
                book.coverImage ||
                'https://via.placeholder.com/80x120.png?text=N/A'
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

    async function showDetailModal(bookId, listType) {
        const bookData = allBooksData[
            listType === 'wishlist' ? 'wishlist' : 'myLibrary'
        ].find((b) => b.id === bookId);
        if (!bookData) return;

        renderDetailView(bookData, listType);
        detailDialog.showModal();

        if (listType === 'library') {
            try {
                const response = await fetch(
                    `/api/books/${bookId}/recommendations`
                );
                const recommendations = await response.json();
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

    function renderDetailView(book, listType) {
        const createTagList = (items) => {
            if (!items || items.length === 0)
                return '<p class="placeholder-inline">Нет данных</p>';
            return items
                .map((item) => `<span class="tag-item">${item}</span>`)
                .join('');
        };

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

        // --- НОВОЕ: Логика для отображения формата и местоположения ---
        const formatText =
            book.format === 'digital' ? 'Цифровая' : 'Физическая';
        const locationText = book.location === 'work' ? 'На работе' : 'Дома';
        const moveButtonText =
            book.location === 'work' ? 'Забрать домой' : 'Отнести на работу';

        // Кнопку перемещения показываем только для физических книг
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
                    }</p> <p><strong>Год издания:</strong> ${
            book.publicationYear || '–'
        }</p>
                    <p><strong>Стр:</strong> ${book.pageCount || '–'}</p>
                    <p><strong>Формат:</strong> ${formatText}</p> <p><strong>Прочитана:</strong> ${
            book.dateRead || '–'
        }</p>
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

        const moveBtn = document.getElementById('move-location-btn');
        if (moveBtn) {
            moveBtn.addEventListener('click', () =>
                moveBook(book.id, book.location)
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
            .addEventListener('click', () => deleteBook(book.id));
    }

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
            
            <fieldset>...</fieldset>
            <fieldset>...</fieldset>
            
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
                saveBookChanges(book.id);
            });
        document
            .getElementById('cancel-edit-btn')
            .addEventListener('click', () => renderDetailView(book, listType));
    }

    // --- ФУНКЦИИ ВЗАИМОДЕЙСТВИЯ С API ---

    async function saveBookChanges(bookId) {
        const stringToArray = (str) =>
            str ? str.split(',').map((item) => item.trim()) : [];
        const getIntOrNull = (id) => {
            const value = document.getElementById(id).value;
            return value ? parseInt(value, 10) : null;
        };

        const updatedBook = {
            id: bookId,
            title: document.getElementById('edit-title').value,
            author: document.getElementById('edit-author').value,
            coverImage: document.getElementById('edit-coverImage').value,
            // --- НОВЫЕ ПОЛЯ ---
            dateRead: document.getElementById('edit-dateRead').value,
            location: document.getElementById('edit-location').value,
            format: document.getElementById('edit-format').value,
            publisherSeries: document.getElementById('edit-publisherSeries')
                .value,
            // ---
            isbn: document.getElementById('edit-isbn').value,
            publisher: document.getElementById('edit-publisher').value,
            publicationYear: getIntOrNull('edit-publicationYear'),
            pageCount: getIntOrNull('edit-pageCount'),
            genre: document.getElementById('edit-genre').value,
            series: {
                name: document.getElementById('edit-series-name').value,
                bookNumber: getIntOrNull('edit-series-number'),
            },
            tags: stringToArray(document.getElementById('edit-tags').value),
            keyThemes: stringToArray(
                document.getElementById('edit-keyThemes').value
            ),
            status: document.getElementById('edit-status').value, // Это поле было в другой секции, но оно уже есть
            rating: {
                overall: getIntOrNull('edit-rating-overall'),
                plot: getIntOrNull('edit-rating-plot'),
                characters: getIntOrNull('edit-rating-characters'),
                worldBuilding: getIntOrNull('edit-rating-world'),
                prose: getIntOrNull('edit-rating-prose'),
            },
            myNotes: document.getElementById('edit-myNotes').value,
        };

        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBook),
            });
            if (!response.ok) throw new Error('Ошибка сохранения');
            detailDialog.close();
            initApp();
        } catch (error) {
            console.error('Не удалось сохранить изменения:', error);
            alert('Ошибка сохранения');
        }
    }

    async function deleteBook(bookId) {
        if (!confirm('Вы уверены, что хотите удалить эту книгу?')) return;
        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Ошибка удаления');
            detailDialog.close();
            initApp();
        } catch (error) {
            console.error('Не удалось удалить книгу:', error);
            alert('Ошибка удаления');
        }
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ИНИЦИАЛИЗАЦИЯ ---

    async function initApp() {
        try {
            const response = await fetch('/api/books');
            if (!response.ok) throw new Error('Ошибка сети');
            allBooksData = await response.json();
            applyFiltersAndSearch();
        } catch (error) {
            console.error('Не удалось загрузить данные:', error);
            bookListContainer.innerHTML = '<p>Ошибка загрузки данных.</p>';
        }
    }

    function translateStatus(status) {
        const statuses = {
            read: 'Прочитана',
            'to-read': 'Хочу прочитать',
            reading: 'Читаю',
        };
        return statuses[status] || 'Неизвестно';
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter;
            applyFiltersAndSearch();
        });
    });

    addBookBtn.addEventListener('click', () => addDialog.showModal());
    cancelAddBtn.addEventListener('click', () => addDialog.close());

    addBookForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addBookForm);
        // Этот код формы добавления устарел. Его нужно будет обновить, чтобы он соответствовал новой структуре.
        // Пока оставляем как есть, чтобы не сломать.
        const newBook = {
            title: formData.get('title'),
            author: formData.get('author'),
            status: formData.get('status'),
            tags: formData
                .get('tags')
                .split(',')
                .map((tag) => tag.trim()),
        };

        try {
            const response = await fetch('/api/add-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBook),
            });
            if (!response.ok) throw new Error('Сервер не смог сохранить книгу');
            addBookForm.reset();
            addDialog.close();
            initApp();
        } catch (error) {
            console.error('Ошибка при добавлении книги:', error);
            alert('Не удалось добавить книгу');
        }
    });

    searchInput.addEventListener('input', applyFiltersAndSearch);

    sortSelect.addEventListener('change', () => {
        applyFiltersAndSearch();
    });

    // --- ЗАПУСК ПРИЛОЖЕНИЯ ---
    initApp();
});
