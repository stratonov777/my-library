const express = require('express');
const path = require('path');
const bookRoutes = require('./api/books'); // Импортируем нашу логику для книг

const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для обслуживания статических файлов (HTML, CSS, JS клиента)
// Путь теперь строится от папки src, поэтому нужно выйти на один уровень вверх
app.use(express.static(path.join(__dirname, '..', 'public')));

// Подключаем наш модуль с роутами для книг по префиксу /api/books
app.use('/api/books', bookRoutes);

module.exports = app; // Экспортируем настроенное приложение
