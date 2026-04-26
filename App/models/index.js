const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

// Импорт моделей (можно вынести в отдельные файлы, здесь для краткости)
const User = sequelize.define('User', {
    UserId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('Admin', 'Recruiter', 'Candidate'), allowNull: false }
});

const Profile = sequelize.define('Profile', {
    UserId: { type: DataTypes.INTEGER, primaryKey: true },
    full_name: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT }
});

const Vacancy = sequelize.define('Vacancy', {
    VacancyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: 'open' }
});

const CheckListTemplate = sequelize.define('CheckListTemplate', {
    TemplateId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stage_name: { type: DataTypes.STRING, allowNull: false },
    order_index: { type: DataTypes.INTEGER, allowNull: false }
});

const Application = sequelize.define('Application', {
    ApplicationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

const CandidateProgress = sequelize.define('CandidateProgress', {
    ProgressId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    comment: { type: DataTypes.TEXT }
});

const ChatMessage = sequelize.define('ChatMessage', {
    MessageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    message_text: { type: DataTypes.TEXT, allowNull: false },
    sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const Interview = sequelize.define('Interview', {
    InterviewId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_link: { type: DataTypes.STRING, allowNull: true },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    status: {
        type: DataTypes.STRING, defaultValue: 'scheduled' // например: scheduled, completed, cancelled
    }
});

const GlobalTemplate = sequelize.define('GlobalTemplate', {
    GlobalTemplateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'GlobalTemplateId' // Явное указание имени колонки
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    recruiter_id: { type: DataTypes.INTEGER } // Убедись, что это поле тоже есть
}, {
    tableName: 'GlobalTemplates' // Хорошая практика — явно указать имя таблицы
});

const GlobalTemplateItem = sequelize.define('GlobalTemplateItem', {
    ItemId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ItemId'
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
    global_template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'global_template_id', // Тоже лучше указать явно
        references: {
            model: 'GlobalTemplates',
            key: 'GlobalTemplateId'
        }
    }
}, {
    tableName: 'GlobalTemplateItems'
});

// Настройка ассоциаций (связей)
User.hasOne(Profile, { foreignKey: 'UserId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(Vacancy, { foreignKey: 'recruiter_id' });
Vacancy.belongsTo(User, { foreignKey: 'recruiter_id', as: 'Recruiter' });

Vacancy.hasMany(CheckListTemplate, { foreignKey: 'vacancy_id', onDelete: 'CASCADE' });
CheckListTemplate.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

Vacancy.hasMany(Application, { foreignKey: 'vacancy_id' });
Application.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

User.hasMany(Application, { foreignKey: 'candidate_id' });
Application.belongsTo(User, { foreignKey: 'candidate_id', as: 'Candidate' });

Application.hasMany(CandidateProgress, { foreignKey: 'application_id', onDelete: 'CASCADE' });
CandidateProgress.belongsTo(Application, { foreignKey: 'application_id' });

CheckListTemplate.hasMany(CandidateProgress, { foreignKey: 'template_id' });
CandidateProgress.belongsTo(CheckListTemplate, { foreignKey: 'template_id' });

User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'SentMessages' });
User.hasMany(ChatMessage, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });
ChatMessage.belongsTo(User, { foreignKey: 'receiver_id', as: 'Receiver' });

// Связи для глобальных шаблонов
User.hasMany(GlobalTemplate, { foreignKey: 'recruiter_id' });
GlobalTemplate.belongsTo(User, { foreignKey: 'recruiter_id' });

GlobalTemplate.hasMany(GlobalTemplateItem, { foreignKey: 'global_template_id', onDelete: 'CASCADE' });
GlobalTemplateItem.belongsTo(GlobalTemplate, { foreignKey: 'global_template_id' });

Application.hasMany(Interview, { foreignKey: 'application_id', onDelete: 'CASCADE' });
Interview.belongsTo(Application, { foreignKey: 'application_id' });

module.exports = {
    sequelize,
    User,
    Profile,
    Vacancy,
    CheckListTemplate,
    Application,
    CandidateProgress,
    ChatMessage,
    Interview,
    GlobalTemplate,
    GlobalTemplateItem
};