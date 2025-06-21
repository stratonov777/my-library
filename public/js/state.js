// state.js
export const state = {
    allBooksData: { myLibrary: [], wishlist: [] },
    currentlyDisplayedBooks: [],
    activeFilter: 'my-library',
    currentPage: 1,
    booksPerPage: 15,
};

export function updateState(newState) {
    Object.assign(state, newState);
}
