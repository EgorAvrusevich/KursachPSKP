const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

// --- МОДЕЛИ ---

const User = sequelize.define('User', {
    UserId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { isIn: [['Admin', 'Recruiter', 'Candidate']] }
    }
}, { tableName: 'Users' });

const Profile = sequelize.define('Profile', {
    UserId: { type: DataTypes.INTEGER, primaryKey: true },
    full_name: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(50) },
    bio: { type: DataTypes.TEXT }
}, { tableName: 'Profiles' });

const Vacancy = sequelize.define('Vacancy', {
    VacancyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    city: { type: DataTypes.STRING(255) },
    salary: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(50), defaultValue: 'open' },
    recruiter_id: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'Vacancies' });

const CheckListTemplate = sequelize.define('CheckListTemplate', {
    TemplateId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stage_name: { type: DataTypes.STRING(255), allowNull: false },
    order_index: { type: DataTypes.INTEGER, allowNull: false },
    vacancy_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'CheckListTemplates' });

const Application = sequelize.define('Application', {
    ApplicationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
    vacancy_id: { type: DataTypes.INTEGER },
    candidate_id: { type: DataTypes.INTEGER }
}, { tableName: 'Applications' });

const CandidateProgress = sequelize.define('CandidateProgress', {
    ProgressId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    comment: { type: DataTypes.TEXT },
    application_id: { type: DataTypes.INTEGER },
    template_id: { type: DataTypes.INTEGER }
}, { tableName: 'CandidateProgress' });

const Interview = sequelize.define('Interview', {
    InterviewId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_link: { type: DataTypes.STRING(500), allowNull: true },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING(50), defaultValue: 'scheduled' },
    show_comments_to_candidate: { type: DataTypes.BOOLEAN, defaultValue: false },
    application_id: { type: DataTypes.INTEGER }
}, { tableName: 'Interviews' });

const GlobalTemplate = sequelize.define('GlobalTemplate', {
    GlobalTemplateId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT },
    recruiter_id: { type: DataTypes.INTEGER }
}, { tableName: 'GlobalTemplates' });

const GlobalTemplateItem = sequelize.define('GlobalTemplateItem', {
    ItemId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
    global_template_id: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'GlobalTemplateItems' });

const ApprovedCandidate = sequelize.define('ApprovedCandidate', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recruiter_id: { type: DataTypes.INTEGER, allowNull: false },
    candidate_id: { type: DataTypes.INTEGER, allowNull: false },
    added_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    notes: { type: DataTypes.TEXT, allowNull: true },// Заметки о том, почему кандидат одобрен}
},
    {
        tableName: 'ApprovedCandidates',
        timestamps: false
    });

const Chat = sequelize.define('Chat', {
    ChatId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'chat_id' },
    application_id: { type: DataTypes.INTEGER, field: 'application_id' }
}, {
    tableName: 'Chats',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const ChatMessage = sequelize.define('ChatMessage', {
    MessageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    message_text: { type: DataTypes.TEXT, allowNull: false },
    sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    chat_id: { type: DataTypes.INTEGER, allowNull: false },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'ChatMessages',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

// --- АССОЦИАЦИИ (ГДЕ ВСЁ ЛОМАЛОСЬ) ---

// Пользователь - Профиль
User.hasOne(Profile, { foreignKey: 'UserId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'UserId' });

// Вакансия - Рекрутер
User.hasMany(Vacancy, { foreignKey: 'recruiter_id', onDelete: 'NO ACTION' });
Vacancy.belongsTo(User, { foreignKey: 'recruiter_id', as: 'Recruiter' });
// Вакансия - Профиль
Vacancy.belongsTo(Profile, { foreignKey: 'recruiter_id', targetKey: 'UserId', as: 'RecruiterProfile' });

// Вакансия - Шаблоны
Vacancy.hasMany(CheckListTemplate, { foreignKey: 'vacancy_id', onDelete: 'CASCADE' });
CheckListTemplate.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

// Вакансия - Заявка (ОСНОВНОЙ КАСКАД)
Vacancy.hasMany(Application, { foreignKey: 'vacancy_id', onDelete: 'CASCADE' });
Application.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

// Пользователь - Заявка
User.hasMany(Application, { foreignKey: 'candidate_id', onDelete: 'NO ACTION' });
Application.belongsTo(User, { foreignKey: 'candidate_id', as: 'Candidate' });

// Заявка - Чат
Application.hasOne(Chat, { foreignKey: 'application_id', onDelete: 'CASCADE' });
Chat.belongsTo(Application, { foreignKey: 'application_id' });

// Чат - Сообщения
Chat.hasMany(ChatMessage, { foreignKey: 'chat_id', onDelete: 'CASCADE' });
ChatMessage.belongsTo(Chat, { foreignKey: 'chat_id' });

// Пользователь - Сообщения
User.hasMany(ChatMessage, { foreignKey: 'sender_id', onDelete: 'NO ACTION' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });

// Заявка - Прогресс
Application.hasMany(CandidateProgress, { foreignKey: 'application_id', onDelete: 'CASCADE' });
CandidateProgress.belongsTo(Application, { foreignKey: 'application_id' });

// Шаблон - Прогресс
CheckListTemplate.hasMany(CandidateProgress, { foreignKey: 'template_id', onDelete: 'NO ACTION' });
CandidateProgress.belongsTo(CheckListTemplate, { foreignKey: 'template_id' });

// Глобальные шаблоны
User.hasMany(GlobalTemplate, { foreignKey: 'recruiter_id', onDelete: 'NO ACTION' });
GlobalTemplate.belongsTo(User, { foreignKey: 'recruiter_id' });

GlobalTemplate.hasMany(GlobalTemplateItem, { foreignKey: 'global_template_id', onDelete: 'CASCADE' });
GlobalTemplateItem.belongsTo(GlobalTemplate, { foreignKey: 'global_template_id' });

// Заявка - Интервью
Application.hasMany(Interview, { foreignKey: 'application_id', onDelete: 'CASCADE' });
Interview.belongsTo(Application, { foreignKey: 'application_id' });

// Избранные вакансии
const SavedVacancy = sequelize.define('SavedVacancy', {
    SaveId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    vacancy_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'SavedVacancies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Одобренные кандидаты (Связь многие-ко-многим между рекрутером и кандидатом)
User.hasMany(ApprovedCandidate, { foreignKey: 'recruiter_id', as: 'ApprovedList', onDelete: 'CASCADE' });
ApprovedCandidate.belongsTo(User, { foreignKey: 'recruiter_id', as: 'Recruiter' });

User.hasMany(ApprovedCandidate, { foreignKey: 'candidate_id', as: 'InApprovedLists', onDelete: 'CASCADE' });
ApprovedCandidate.belongsTo(User, { foreignKey: 'candidate_id', as: 'Candidate' });

// Если нужно получать профиль кандидата напрямую через ApprovedCandidate
ApprovedCandidate.belongsTo(Profile, { foreignKey: 'candidate_id', targetKey: 'UserId', as: 'CandidateProfile' });

// Ассоциации для SavedVacancy
User.hasMany(SavedVacancy, { foreignKey: 'user_id', onDelete: 'CASCADE' });
SavedVacancy.belongsTo(User, { foreignKey: 'user_id' });

Vacancy.hasMany(SavedVacancy, { foreignKey: 'vacancy_id', onDelete: 'CASCADE' });
SavedVacancy.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

module.exports = {
    sequelize, User, Profile, Vacancy, CheckListTemplate,
    Application, CandidateProgress, ChatMessage, Chat,
    Interview, GlobalTemplate, GlobalTemplateItem,
    ApprovedCandidate, SavedVacancy
};