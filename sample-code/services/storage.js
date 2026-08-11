function persist(entry) {
    database.insert(entry);
}

module.exports = { persist };