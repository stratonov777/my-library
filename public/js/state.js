// public/js/state.js

/**
 * ===================================================================
 * | state.js: Модуль для управления глобальным состоянием          |
 * ===================================================================
 * * Назначение:
 * Этот файл содержит централизованный объект `state`, который является
 * "единым источником правды" для всего приложения. Все динамические
 * данные (списки книг, текущие фильтры, пагинация) хранятся здесь.
 * Это позволяет избежать передачи данных через множество функций и
 * упрощает отладку.
 */

// Экспортируем сам объект состояния, чтобы другие модули могли его читать.
export const state = {
    // allBooksData: Хранит полный, немодифицированный список книг,
    // полученный с сервера. Разделен на `myLibrary` и `wishlist`.
    allBooksData: { myLibrary: [], wishlist: [] },

    // currentlyDisplayedBooks: Массив книг, который отображается
    // на странице в данный момент. Это результат применения всех
    // фильтров и сортировок к `allBooksData`.
    currentlyDisplayedBooks: [],

    // activeFilter: Строка, определяющая, какая "полка" выбрана
    // ('my-library', 'to-read', 'wishlist').
    activeFilter: 'my-library',

    // currentPage: Номер текущей страницы для пагинации.
    currentPage: 1,

    // booksPerPage: Количество книг, отображаемое на одной странице.
    booksPerPage: 15,
};

/**
 * Безопасно обновляет глобальное состояние.
 * Принимает объект с новыми значениями и сливает его с текущим состоянием.
 * @param {Object} newState - Объект, содержащий поля состояния для обновления.
 */
export function updateState(newState) {
    // Object.assign() копирует свойства из `newState` в `state`,
    // перезаписывая существующие или добавляя новые.
    Object.assign(state, newState);
}
