const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
// Обратите внимание на путь: мы выходим из папки api, затем из папки src, чтобы найти database.json
const dbPath = path.join(__dirname, '..', '..', 'database.json');

// GET / - Получить все книги (путь относительно /api/books)
router.get('/', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Ошибка на сервере');
        }
        res.json(JSON.parse(data));
    });
});

// POST / - Добавить новую книгу
router.post('/', (req, res) => {
    const newBook = req.body;
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла:', err);
            return res
                .status(500)
                .send('Ошибка на сервере при чтении базы данных');
        }

        let db;
        try {
            // Оборачиваем парсинг в try...catch, чтобы отловить ошибки в JSON
            db = JSON.parse(data);
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
            // Отправляем осмысленную ошибку, если JSON некорректен
            return res
                .status(500)
                .send('База данных повреждена (некорректный JSON).');
        }

        newBook.id = Date.now();

        // Добавляем книгу в массив myLibrary (пока по умолчанию)
        if (!db.myLibrary) db.myLibrary = [];
        db.myLibrary.push(newBook);

        fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Ошибка при сохранении книги:', err);
                return res.status(500).send('Ошибка при сохранении книги');
            }
            res.status(201).json(newBook);
        });
    });
});

// GET /:id/recommendations - Получить рекомендации
router.get('/:id/recommendations', (req, res) => {
    const sourceBookId = parseInt(req.params.id);
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');
        const db = JSON.parse(data);
        const allLibraryBooks = db.myLibrary;
        const sourceBook = allLibraryBooks.find((b) => b.id === sourceBookId);
        if (!sourceBook) {
            return res.status(404).json([]);
        }
        const recommendations = [];
        allLibraryBooks.forEach((book) => {
            if (book.id === sourceBookId) return;
            let score = 0;
            if (book.author === sourceBook.author) score += 10;
            if (book.genre && book.genre === sourceBook.genre) score += 5;
            if (sourceBook.tags && book.tags) {
                sourceBook.tags.forEach((tag) => {
                    if (book.tags.includes(tag)) score += 2;
                });
            }
            if (score > 0) {
                recommendations.push({ ...book, score });
            }
        });
        const sortedRecommendations = recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        res.json(sortedRecommendations);
    });
});

// PUT /:id - Обновить книгу
router.put('/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const updatedBook = req.body;
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');
        let db = JSON.parse(data);
        let bookIndex = db.myLibrary.findIndex((b) => b.id === bookId);
        if (bookIndex !== -1) {
            db.myLibrary[bookIndex] = { ...updatedBook, id: bookId };
        } else {
            bookIndex = db.wishlist.findIndex((b) => b.id === bookId);
            if (bookIndex !== -1) {
                db.wishlist[bookIndex] = { ...updatedBook, id: bookId };
            } else {
                return res.status(404).send('Книга не найдена');
            }
        }
        fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
            if (err) return res.status(500).send('Ошибка при сохранении книги');
            res.status(200).json(updatedBook);
        });
    });
});

// DELETE /:id - Удалить книгу
router.delete('/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');
        let db = JSON.parse(data);
        const initialLength = db.myLibrary.length + db.wishlist.length;
        db.myLibrary = db.myLibrary.filter((b) => b.id !== bookId);
        db.wishlist = db.wishlist.filter((b) => b.id !== bookId);
        const finalLength = db.myLibrary.length + db.wishlist.length;
        if (initialLength === finalLength) {
            return res.status(404).send('Книга для удаления не найдена');
        }
        fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
            if (err) return res.status(500).send('Ошибка при удалении книги');
            res.status(200).send('Книга успешно удалена');
        });
    });
});

// PATCH /:id/location - Переместить книгу
router.patch('/:id/location', (req, res) => {
    const bookId = parseInt(req.params.id);
    const newLocation = req.body.location;
    if (!newLocation) {
        return res.status(400).send('Новое местоположение не указано');
    }
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');
        let db = JSON.parse(data);
        let book = db.myLibrary.find((b) => b.id === bookId);
        if (!book) {
            return res.status(404).send('Книга не найдена');
        }
        book.location = newLocation;
        fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
            if (err) return res.status(500).send('Ошибка при сохранении книги');
            res.status(200).json(book);
        });
    });
});

module.exports = router;
