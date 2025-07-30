// Import telegraf, mango, cron and moment
const { Telegraf, Markup } = require('telegraf')
const { MongoClient, ObjectId } = require('mongodb');
const cron = require('node-cron');
const moment = require('moment');

// Creat bot instance
const bot = new Telegraf('7252237902:AAEB6X8hSK0CXnh7oWb86J3kXVxGSOvtuaQ')


// Connect to book-504-word database in mango
const url = 'mongodb://localhost:27017/book-504-word';
const client = new MongoClient(url);
const db = client.db();

// Start command will return list of lessons
bot.command('start', async (ctx) => {
    const lessonsCollection = db.collection('lessons')
    const userCollection = db.collection('users')
    let listOfLessons = await lessonsCollection.find().toArray()
    let telegramId = ctx.message.chat.id
    let buttonArray = []

    if (!await userCollection.findOne({ telegramId: telegramId })) {
        await userCollection.insertOne({ 'telegramId': telegramId })
    }


    for (let i = 0; i < listOfLessons.length; i += 3) {
        buttonArray.push([
            Markup.button.callback(listOfLessons[i].lesson, `lesson-${listOfLessons[i].lesson}`),
            i + 1 < listOfLessons.length ? Markup.button.callback(listOfLessons[i + 1].lesson, `lesson-${listOfLessons[i + 1].lesson}`) : undefined,
            i + 2 < listOfLessons.length ? Markup.button.callback(listOfLessons[i + 2].lesson, `lesson-${listOfLessons[i + 2].lesson}`) : undefined
        ])
    }

    let buttonLesson = Markup.inlineKeyboard(buttonArray)

    console.log(new Date())

    ctx.sendMessage('لیست تمامی درس ها', buttonLesson)
})

// Note command will return all of user note
bot.command('note', async (ctx) => {
    const noteCollection = db.collection('notes')
    let telegramId = ctx.message.chat.id
    let notes = await noteCollection.find({ telegramId: telegramId }).toArray()
    let message = ''

    for (let note in notes) {
        message += `
${parseInt(note) + 1}. درس : ${notes[note].lessonId}
یاداشت : ${notes[note].note}
`
    }

    let buttons = Markup.inlineKeyboard([[Markup.button.callback('ویرایش', 'noteUpdate'), Markup.button.callback('حذف', `noteDel`)], [Markup.button.callback('بازگشت', 'backToLessons')]])

    if (!message) {
        message = 'یاداشتی وجود ندارد'
        buttons = Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')])
    }

    ctx.sendMessage(message, buttons)
})

// Help command will give some information about bot and some ways to communicate to devlopers
bot.command('help', (ctx) => {
    ctx.sendMessage(`
درباره ی این روبات
سلام من یک روبات اموزش 504 کلمه ی ضروری انگلیسی هستم  که در جهت یادگیری شما راه اندازی شده ام
    
سوالی دارید ؟؟؟  
من اینجا هستم 
ادرس گیت : aliahmadi.py2000@gmail.com
شماره تلفن : 0939327199
ایمیل : mo.mohamadashrafi1@gmail.com`, Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')]))
})

// LeiterBox command will show user leitner box and ask words from user 
bot.command('leitnerBox', async (ctx) => {
    const leitnerBoxCollection = db.collection('leitnerBox')
    const dictionaryCollection = db.collection('dictionary')

    let leitnerIndex = await leitnerBoxCollection.findOne({ telegramId: ctx.message.chat.id })
    let word = await dictionaryCollection.findOne({ _id: leitnerIndex.wordId })
    if (new Date(leitnerIndex.addedAt).getDate() == new Date().getDate()) {
        ctx.sendMessage(`کلمه : ${word.word}`, Markup.inlineKeyboard([Markup.button.callback('دیدن کارت', `showCard-${word._id.toString()}-${leitnerIndex._id}`)]))
    }

    else {
        ctx.sendMessage('امروز کلمه ای ندارید', 'backToLessons')
    }
})

// Lesson action will give user words of that lesson and finally a story
bot.action(/^lesson-([0-9]+)$/i, async (ctx) => {
    const dictionaryCollection = db.collection('dictionary')
    let numberLesson = ctx.match[1]
    let word = await dictionaryCollection.findOne({ lesson: parseInt(numberLesson) })
    let lastIndex = await dictionaryCollection.countDocuments({ lesson: parseInt(numberLesson) }) - 1

    ctx.editMessageText(`

کلمه : ${word.word}
فارسی : ${word.persianWord}
تعریف : ${word.definition}

مثال یک : ${word.exampleA}

معنی : ${word.persianExampleA}

مثال دو : ${word.exampleB}

معنی : ${word.persianExampleB}

مثال سه : ${word.exampleC}

معنی : ${word.persianExampleC}`, Markup.inlineKeyboard([Markup.button.callback('«', `previous-${numberLesson}-${lastIndex}`),
    Markup.button.callback('خواندن داستان', `story-${numberLesson}`), Markup.button.callback('»', `next-${numberLesson}-1`)]))
})

// Story action will give user a story about some words who has read
bot.action(/^story-([0-9]+)$/i, async (ctx) => {
    const storyCollection = db.collection('lessons')
    let numberLesson = ctx.match[1]
    let story = await storyCollection.findOne({ lesson: parseInt(numberLesson) })
    ctx.editMessageText(`
عنوان درس : ${story.storyTitle}
معنی : ${story.storyTitlePersian}


متن درس : ${story.story}


معنی : ${story.persianStory}`, Markup.inlineKeyboard([Markup.button.callback('لیست دروس', `backToLessons`), Markup.button.callback('ایجاد یاداشت', `note-${numberLesson}`), Markup.button.callback('اضافه به جعبه', `addLessonToLeitnerBox-${numberLesson}`)]))
})

// Next action will show user next word of lesson
bot.action(/^next-([0-9]+)-([0-9]+)$/i, async (ctx) => {
    const dictionaryCollection = db.collection('dictionary')
    let numberLesson = ctx.match[1]
    let idWord = ctx.match[2]

    if (idWord == 12) {
        idWord = -1
    }

    let word = (await dictionaryCollection.find({ lesson: parseInt(numberLesson) }).toArray()).at(idWord)

    ctx.editMessageText(`
کلمه : ${word.word}
فارسی : ${word.persianWord}
تعریف : ${word.definition}

مثال یک : ${word.exampleA}

معنی : ${word.persianExampleA}

مثال دو : ${word.exampleB}

معنی : ${word.persianExampleB}

مثال سه : ${word.exampleC}

معنی : ${word.persianExampleC}`, Markup.inlineKeyboard([Markup.button.callback('«', `previous-${numberLesson}-${parseInt(idWord) - 1}`), Markup.button.callback('خواندن داستان', `story-${numberLesson}`), Markup.button.callback('»', `next-${numberLesson}-${parseInt(idWord) + 1}`)]))
})

// Previous action will show user previous word of lesson
bot.action(/^previous-([0-9]+)-([0-9]+)$/i, async (ctx) => {
    const dictionaryCollection = db.collection('dictionary')
    let numberLesson = ctx.match[1]
    let idWord = ctx.match[2]

    if (idWord == 0) {
        idWord = 11
    }

    let word = (await dictionaryCollection.find({ lesson: parseInt(numberLesson) }).toArray()).at(idWord)

    ctx.editMessageText(`
کلمه : ${word.word}
فارسی : ${word.persianWord}
تعریف : ${word.definition}

مثال یک : ${word.exampleA}

معنی : ${word.persianExampleA}

مثال دو : ${word.exampleB}

معنی : ${word.persianExampleB}

مثال سه : ${word.exampleC}

معنی : ${word.persianExampleC}`, Markup.inlineKeyboard([Markup.button.callback('«', `previous-${numberLesson}-${parseInt(idWord) - 1}`), Markup.button.callback('خواندن داستان', `story-${numberLesson}`), Markup.button.callback('»', `next-${numberLesson}-${parseInt(idWord) + 1}`)]))
})

// BackToLessons action will return user to list of lesson page
bot.action('backToLessons', async (ctx) => {
    const lessonsCollection = db.collection('lessons')
    let listOfLessons = await lessonsCollection.find().toArray()
    let buttonArray = []

    for (let i = 0; i < listOfLessons.length; i += 3) {
        buttonArray.push([
            Markup.button.callback(listOfLessons[i].lesson, `lesson-${listOfLessons[i].lesson}`),
            i + 1 < listOfLessons.length ? Markup.button.callback(listOfLessons[i + 1].lesson, `lesson-${listOfLessons[i + 1].lesson}`) : undefined,
            i + 2 < listOfLessons.length ? Markup.button.callback(listOfLessons[i + 2].lesson, `lesson-${listOfLessons[i + 2].lesson}`) : undefined
        ])
    }

    let buttonLesson = Markup.inlineKeyboard(buttonArray)
    ctx.editMessageText('لیست تمامی درس ها', buttonLesson)
})

// AddLessonToLeitnerBox will add a lesson and word to user lietnerbox
bot.action(/^addLessonToLeitnerBox-([0-9]+)/i, async (ctx) => {
    const dictionaryCollection = db.collection('dictionary')
    const leitnerBoxCollection = db.collection('leitnerBox')
    let lesson = ctx.match[1]
    let words = await dictionaryCollection.find({ lesson: parseInt(lesson) }).toArray()

    let today = new Date();
    let tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);


    for (let word in words) {
        if (!await leitnerBoxCollection.findOne({ telegramId: ctx.from.id, wordId: words[word]._id })) {
            leitnerBoxCollection.insertOne({ telegramId: ctx.from.id, wordId: words[word]._id, addedAt: today, level: 1, reviewAt: today })
        }
    }

    ctx.editMessageText('کلمات با موفقیت به جعبه اضافه شدند', Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')]))
})

// Note action will add a note for user to lesson
bot.action(/^note-([0-9]+)/i, async (ctx) => {
    let lessonId = ctx.match[1]
    ctx.editMessageText('یاداشت خود را وارد کنید')
    bot.on('message', async (ctx) => {
        const noteCollection = db.collection('notes')

        let noteText = ctx.message.text
        let telegramId = ctx.from.id

        await noteCollection.insertOne({ telegramId: telegramId, lessonId: lessonId, note: noteText })

        ctx.sendMessage('یاداشت با موفقیت ایجاد شد', Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')]))

    })
})

// NoteDel action will delete a note
bot.action('noteDel', async (ctx) => {
    ctx.editMessageText('یاداشت مورد نظر را انتخاب کنید')
    bot.on('message', async (ctx) => {
        const noteCollection = db.collection('notes')
        let noteNumber = ctx.message.text

        let noteDocuments = await noteCollection.find().toArray()
        await noteCollection.deleteOne({ note: noteDocuments.at(parseInt(noteNumber - 1)).note })
        ctx.sendMessage('یاداشت با موفقیت حذف شد', Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')]))
    })
})

// NoteUpdate action will update a note
bot.action('noteUpdate', async (ctx) => {
    ctx.editMessageText('یاداشت مورد و متن  مورد نظر را انتخاب کنید')
    bot.on('message', async (ctx) => {
        const noteCollection = db.collection('notes')
        let noteNumber = ctx.message.text.split('.')[0]
        let noteDocuments = await noteCollection.find().toArray()

        noteCollection.updateOne({ note: noteDocuments.at(parseInt(noteNumber - 1)).note }, { $set: { note: ctx.message.text.split('.')[1] } })

        ctx.sendMessage('یاداشت با موفقیت ویراش شد', Markup.inlineKeyboard([Markup.button.callback('بازگشت', 'backToLessons')]))
    })
})

// ShowCard action will show word to user
bot.action(/^showCard-.*-.*/i, async (ctx) => {
    const dictionaryCollection = db.collection('dictionary')
    let word = await dictionaryCollection.findOne({ _id: new ObjectId(ctx.match[0].split('-')[1]) })

    if (!word == null) {
        ctx.editMessageText(`
کلمه : ${word.word}
فارسی : ${word.persianWord}
تعریف : ${word.definition}

مثال یک : ${word.exampleA}

معنی : ${word.persianExampleA}

مثال دو : ${word.exampleB}

معنی : ${word.persianExampleB}

مثال سه : ${word.exampleC}

معنی : ${word.persianExampleC}`, Markup.inlineKeyboard([Markup.button.callback('بلدم', `know-${ctx.match[0].split('-')[2]}-${word._id}`), Markup.button.callback('نمیدونم', `chg`)]))
    }

    else {
        ctx.editMessageText('کلمه ای دیگر وجود ندارد')
    }
})

// Know action will update leitnerbox
bot.action(/^know-.*-.*/i, async (ctx) => {
    console.log(ctx.match)
    console.log(ctx.match[0].split('-')[1])
    const leitnerBoxCollection = db.collection('leitnerBox')
    const dictionaryCollection = db.collection('dictionary')
    let leitnerIndex = await leitnerBoxCollection.findOne({ _id: new ObjectId(ctx.match[0].split('-')[1]) })
    console.log(leitnerIndex)
    console.log('\n\n\n\n')

    switch (leitnerIndex.level) {
        case 1:
            await leitnerBoxCollection.updateOne({ _id: leitnerIndex._id }, { $set: { level: 2, reviewAt: moment().add(1, 'day').toDate() } })
            break

        case 2:
            await leitnerBoxCollection.updateOne({ _id: leitnerIndex._id }, { $set: { level: 3, reviewAt: moment().add(2, 'day').toDate() } })
            break

        case 3:
            await leitnerBoxCollection.updateOne({ _id: leitnerIndex._id }, { $set: { level: 4, reviewAt: moment().add(4, 'day').toDate() } })
            break

        case 4:
            await leitnerBoxCollection.updateOne({ _id: leitnerIndex._id }, { $set: { level: 5, reviewAt: moment().add(8, 'day').toDate() } })
            break

        case 5:
            await leitnerBoxCollection.deleteOne({ _id: leitnerIndex._id })
            break
    }

    let nextLeitnerItem = await leitnerBoxCollection.findOne({ telegramId: ctx.from.id, reviewAt: { $gte: moment(new Date()).startOf('day').toDate(), $lte: moment(new Date()).endOf('day').toDate() } })
    console.log(nextLeitnerItem)
    let word = await dictionaryCollection.findOne({ _id: nextLeitnerItem.wordId })
    console.log(word)


    ctx.editMessageText(`    
کلمه : ${word.word}`, Markup.inlineKeyboard([Markup.button.callback('دیدن کارت', `showCard-${word._id.toString()}-${nextLeitnerItem._id}`)]))
})

// Start bot and remind user if have leitnerbox
client.connect().then(c => {
    bot.launch()

    cron.schedule('0 9 * * *', async () => {
        const leitnerBoxCollection = db.collection('leitnerBox')
        const userCollection = db.collection('users')
        let users = await userCollection.find().toArray()
        let leitnerUserBox = await leitnerBoxCollection.find().toArray()


        for (let user in users) {
            for (let word in leitnerUserBox) {
                if (leitnerUserBox[word].telegramId == users[user].telegramId) {
                    bot.telegram.sendMessage('6135473334', 'جعبه امروز را چک کنید')
                    break
                }
            }
        }
    });
})
