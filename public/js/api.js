// public/js/api.js

/**
 * Запрашивает с сервера полный список книг.
 * @returns {Promise<Object>} Объект с массивами myLibrary и wishlist.
 */
export async function fetchAllBooks() {
    const response = await fetch('/api/books');
    if (!response.ok) throw new Error('Ошибка сети при загрузке книг');
    return response.json();
}

/**
 * Запрашивает с сервера список рекомендованных книг для указанной книги.
 * @param {number} bookId - ID книги, для которой нужны рекомендации.
 * @returns {Promise<Array>} Массив объектов рекомендованных книг.
 */
export async function fetchRecommendations(bookId) {
    const response = await fetch(`/api/books/${bookId}/recommendations`);
    if (!response.ok) throw new Error('Ошибка сети при загрузке рекомендаций');
    return response.json();
}

/**
 * Отправляет на сервер обновленные данные книги.
 * @param {number} bookId - ID обновляемой книги.
 * @param {Object} updatedBook - Объект с полными данными книги.
 * @returns {Promise<Object>} Обновленный объект книги с сервера.
 */
export async function updateBook(bookId, updatedBook) {
    const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook),
    });
    if (!response.ok) throw new Error('Ошибка сохранения книги');
    return response.json();
}

/**
 * Отправляет на сервер запрос на удаление книги.
 * @param {number} bookId - ID удаляемой книги.
 * @returns {Promise<Response>} Ответ сервера.
 */
export async function deleteBook(bookId) {
    const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Ошибка удаления книги');
    return response;
}

/**
 * Отправляет на сервер запрос на изменение местоположения книги.
 * @param {number} bookId - ID перемещаемой книги.
 * @param {string} newLocation - Новое местоположение ('home' или 'work').
 * @returns {Promise<Object>} Обновленный объект книги с сервера.
 */
export async function moveBookLocation(bookId, newLocation) {
    const response = await fetch(`/api/books/${bookId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newLocation }),
    });
    if (!response.ok) throw new Error('Ошибка перемещения книги');
    return response.json();
}

/**
 * Отправляет на сервер данные для добавления новой книги.
 * @param {Object} newBook - Объект с данными новой книги.
 * @returns {Promise<Object>} Созданный объект книги с сервера.
 */
export async function addBook(newBook) {
    const response = await fetch('/api/books', {
        // <-- Измененный путь
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook),
    });
    if (!response.ok) throw new Error('Сервер не смог добавить книгу');
    return response.json();
}
