const { 
    sequelize, User, Profile, Vacancy, CheckListTemplate, 
    Application, Chat, ChatMessage, GlobalTemplate 
} = require('./models'); // Путь к твоему index.js с моделями
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        // Очищаем таблицы перед заполнением (ОПАСНО: удалит всё!)
        // await sequelize.sync({ force: true }); 

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('password123', salt);

        console.log('--- Start Seeding ---');

        // 1. Создаем пользователей
        const recruiter = await User.create({
            email: 'recruiter@company.com',
            password_hash: password,
            role: 'Recruiter'
        });
        await Profile.create({ UserId: recruiter.UserId, full_name: 'Иван Рекрутеров' });

        const candidate = await User.create({
            email: 'candidate@work.com',
            password_hash: password,
            role: 'Candidate'
        });
        await Profile.create({ UserId: candidate.UserId, full_name: 'Алексей Поисков' });

        // 2. Создаем вакансию
        const vacancy = await Vacancy.create({
            title: 'Node.js Developer',
            description: 'Мы ищем рок-звезду бэкенда!',
            recruiter_id: recruiter.UserId
        });

        // 3. Создаем этапы чек-листа для вакансии
        await CheckListTemplate.bulkCreate([
            { stage_name: 'Скрининг', order_index: 1, vacancy_id: vacancy.VacancyId },
            { stage_name: 'Техническое интервью', order_index: 2, vacancy_id: vacancy.VacancyId },
            { stage_name: 'Оффер', order_index: 3, vacancy_id: vacancy.VacancyId }
        ]);

        // 4. Создаем заявку (от кандидата на вакансию)
        const app = await Application.create({
            vacancy_id: vacancy.VacancyId,
            candidate_id: candidate.UserId,
            status: 'pending'
        });

        // 5. Создаем чат для этой заявки
        const chat = await Chat.create({ application_id: app.ApplicationId });

        // 6. Создаем первое сообщение
        await ChatMessage.create({
            chat_id: chat.ChatId,
            sender_id: recruiter.UserId,
            message_text: 'Здравствуйте! Мы рассмотрели ваше резюме.',
            is_system: false
        });

        console.log('✅ База успешно заполнена тестовыми данными!');
    } catch (error) {
        console.error('❌ Ошибка при сидировании:', error);
    } finally {
        await sequelize.close();
    }
}

seed();