/**
 * =====================================================================
 * | api/books.js: Модуль-роутер для всех операций с книгами           |
 * =====================================================================
 * * Назначение:
 * Этот файл инкапсулирует всю логику API, связанную с книгами.
 * Он определяет конечные точки (endpoints) для получения, добавления,
 * обновления и удаления книг из файла `database.json`.
 *
 * * Принцип работы:
 * - Создается экземпляр `express.Router()`.
 * - Для каждого действия (CRUD) определяется свой маршрут и обработчик.
 * - Все обработчики асинхронно читают файл `database.json`, выполняют
 * необходимые манипуляции с данными и записывают обновленные данные обратно.
 * - Используются HTTP-статусы для информирования клиента о результате операции.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Путь к файлу базы данных. `path.join` используется для кросс-платформенной совместимости.
const dbPath = path.join(__dirname, '..', '..', 'database.json');

/**
 * @route   GET /
 * @desc    Получить все книги из библиотеки и списка желаний.
 * @access  Public
 */
router.get('/', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла:', err);
            return res
                .status(500)
                .send('Ошибка на сервере при чтении базы данных');
        }
        try {
            res.json(JSON.parse(data));
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
            res.status(500).send('База данных повреждена (некорректный JSON).');
        }
    });
});

/**
 * @route   POST /
 * @desc    Добавить новую книгу.
 * @access  Public
 */
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
            db = JSON.parse(data);
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
            return res
                .status(500)
                .send('База данных повреждена (некорректный JSON).');
        }

        newBook.id = Date.now(); // Генерируем уникальный ID на основе времени
        db.myLibrary.push(newBook); // Добавляем книгу в массив

        fs.writeFile(
            dbPath,
            JSON.stringify(db, null, 2),
            'utf8',
            (writeErr) => {
                if (writeErr) {
                    console.error('Ошибка при сохранении книги:', writeErr);
                    return res.status(500).send('Ошибка при сохранении книги');
                }
                res.status(201).json(newBook); // Отправляем обратно созданную книгу со статусом 201 (Created)
            }
        );
    });
});

/**
 * @route   GET /:id/recommendations
 * @desc    Получить список из 5 рекомендованных книг.
 * @access  Public
 */
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

/**
 * @route   PUT /:id
 * @desc    Полностью обновить информацию о книге.
 * @access  Public
 */
router.put('/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const updatedBook = req.body;
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');
        let db = JSON.parse(data);
        let bookIndex = db.myLibrary.findIndex((b) => b.id === bookId);

        if (bookIndex !== -1) {
            // Сохраняем ID, но заменяем все остальные поля на новые
            db.myLibrary[bookIndex] = { ...updatedBook, id: bookId };
        } else {
            // Поиск в списке желаний, если не найдено в основной библиотеке
            bookIndex = db.wishlist.findIndex((b) => b.id === bookId);
            if (bookIndex !== -1) {
                db.wishlist[bookIndex] = { ...updatedBook, id: bookId };
            } else {
                return res.status(404).send('Книга не найдена');
            }
        }
        fs.writeFile(
            dbPath,
            JSON.stringify(db, null, 2),
            'utf8',
            (writeErr) => {
                if (writeErr)
                    return res.status(500).send('Ошибка при сохранении книги');
                res.status(200).json(updatedBook);
            }
        );
    });
});

/**
 * @route   DELETE /:id
 * @desc    Удалить книгу по ID.
 * @access  Public
 */
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

/**
 * @route   PATCH /:id/location
 * @desc    Изменить местоположение книги ('home' <-> 'work').
 * @access  Public
 */
router.patch('/:id/location', (req, res) => {
    const bookId = parseInt(req.params.id);
    const { newLocation } = req.body; // Ожидаем 'home' или 'work'

    if (!['home', 'work'].includes(newLocation)) {
        return res.status(400).send('Некорректное местоположение.');
    }

    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка чтения базы данных');
        let db = JSON.parse(data);
        const bookIndex = db.myLibrary.findIndex((b) => b.id === bookId);

        if (bookIndex === -1) {
            return res.status(404).send('Книга не найдена');
        }

        // Надежно обновляем только тип местоположения
        if (
            typeof db.myLibrary[bookIndex].location === 'object' &&
            db.myLibrary[bookIndex].location !== null
        ) {
            db.myLibrary[bookIndex].location.type = newLocation;
        } else {
            db.myLibrary[bookIndex].location = { type: newLocation };
        }

        const updatedBook = db.myLibrary[bookIndex];

        fs.writeFile(
            dbPath,
            JSON.stringify(db, null, 2),
            'utf8',
            (writeErr) => {
                if (writeErr) return res.status(500).send('Ошибка сохранения');
                res.status(200).json(updatedBook);
            }
        );
    });
});

/**
 * @route   PATCH /:id/return
 * @desc    Оформить возврат книги, которую давали почитать.
 * @access  Public
 */
router.patch('/:id/return', (req, res) => {
    const bookId = parseInt(req.params.id);
    const { returnTo } = req.body; // Ожидаем, куда вернули книгу: 'home' или 'work'

    if (!['home', 'work'].includes(returnTo)) {
        return res
            .status(400)
            .send('Некорректное место возврата. Ожидается "home" или "work".');
    }

    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении базы данных');

        let db;
        try {
            db = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).send('База данных повреждена.');
        }

        const bookIndex = db.myLibrary.findIndex((b) => b.id === bookId);

        if (bookIndex === -1) {
            return res.status(404).send('Книга не найдена в библиотеке');
        }

        // Обновляем местоположение книги
        db.myLibrary[bookIndex].location = {
            type: returnTo,
            to: null,
            contact: null,
        };

        const updatedBook = db.myLibrary[bookIndex];

        fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
            if (err)
                return res.status(500).send('Ошибка при сохранении данных');
            // Отправляем обратно обновленный объект книги
            res.status(200).json(updatedBook);
        });
    });
});

module.exports = router;
