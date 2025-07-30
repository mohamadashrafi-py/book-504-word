const Fs = require('fs');
const CsvReadableStream = require('csv-reader');
const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'book-504-word';

async function main() {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('dictionary');
    const lesson_coll = db.collection('lessons')

    let rows = await readCsv()

    for (item in rows) {
        let word = rows[item]
        await collection.insertOne({ lesson: word[0], word: word[1], persianWord: word[2], definition: word[3], persianExampleA: word[4], exampleA: word[5], persianExampleB: word[6], exampleB: word[7], persianExampleC: word[8], exampleC: word[9] })
    }

    rows = await lesson()

    for (item in rows) {
        let lesson = rows[item]
        await lesson_coll.insertOne({
            lesson: lesson[0], storyTitle: lesson[1], storyTitlePersian: lesson[2], story: lesson[3], persianStory: lesson[4]
        })
    }

    await client.close()
}

main()
    .then(console.log)
    .catch(console.error)

    function readCsv() {
    return new Promise((res, rej) => {
        let inputStream = Fs.createReadStream('504-word.csv', 'utf8');
        rows = []
        inputStream.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
            .on('data', async function (row) {
                rows.push(row);
            })
            .on('end', function () {
                res(rows)
            });
    })
}

function lesson() {
    return new Promise((res, rej) => {
        let inputStream = Fs.createReadStream('lesson.csv', 'utf8');
        rows = []
        inputStream.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
            .on('data', async function (row) {
                rows.push(row);
            })
            .on('end', function () {
                res(rows)
            });
    })
}
