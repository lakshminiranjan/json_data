const fs = require('fs');
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 8080;

const cache = new Map();

// Load initial contacts into cache
function loadCache() {
  const db = require('./db.json');
  if (db && db.contacts) {
    db.contacts.forEach(contact => {
      cache.set(contact.id, contact);
    });
  }
}

// Save cache to db.json
function saveToDB() {
  const db = require('./db.json');
  db.contacts = Array.from(cache.values()); // Convert Map to array
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); // Write to file
}

// Middleware to check cache before accessing db
server.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/contacts')) {
    const contactId = req.params.id;
    if (contactId && cache.has(contactId)) {
      return res.jsonp(cache.get(contactId));
    }
  }
  next();
});

// Middleware to update cache on contact creation or update
router.render = (req, res) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const newContact = res.locals.data;
    cache.set(newContact.id, newContact); // Update cache
    saveToDB(); // Persist cache to db.json
  }
  res.jsonp(res.locals.data);
};

// Middleware for deletion from cache
server.use((req, res, next) => {
  if (req.method === 'DELETE' && req.path.startsWith('/contacts')) {
    const contactId = req.params.id;
    cache.delete(contactId); // Remove from cache
    saveToDB(); // Persist cache to db.json
  }
  next();
});

server.use(middlewares);
server.use(router);

// Initialize cache
loadCache();

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
