const { User, Profile, Vacancy, CheckListTemplate, Application, CandidateProgress, ChatMessage } = require('./models');

function setupAssociations() {
    // 1:1 User <-> Profile
    User.hasOne(Profile, { foreignKey: 'UserId', onDelete: 'CASCADE' });
    Profile.belongsTo(User, { foreignKey: 'UserId' });

    // 1:M User (Recruiter) -> Vacancies
    User.hasMany(Vacancy, { foreignKey: 'recruiter_id' });
    Vacancy.belongsTo(User, { foreignKey: 'recruiter_id', as: 'Recruiter' });

    // 1:M Vacancy -> CheckListTemplates
    Vacancy.hasMany(CheckListTemplate, { foreignKey: 'vacancy_id', onDelete: 'CASCADE' });
    CheckListTemplate.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

    // 1:M Vacancy -> Applications
    Vacancy.hasMany(Application, { foreignKey: 'vacancy_id' });
    Application.belongsTo(Vacancy, { foreignKey: 'vacancy_id' });

    // 1:M User (Candidate) -> Applications
    User.hasMany(Application, { foreignKey: 'candidate_id' });
    Application.belongsTo(User, { foreignKey: 'candidate_id', as: 'Candidate' });

    // 1:M Application -> CandidateProgress
    Application.hasMany(CandidateProgress, { foreignKey: 'application_id', onDelete: 'CASCADE' });
    CandidateProgress.belongsTo(Application, { foreignKey: 'application_id' });

    // 1:M CheckListTemplate -> CandidateProgress (Чтобы знать, какой это этап)
    CheckListTemplate.hasMany(CandidateProgress, { foreignKey: 'template_id' });
    CandidateProgress.belongsTo(CheckListTemplate, { foreignKey: 'template_id' });

    // Чат: M:N через отправителя и получателя
    User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'SentMessages' });
    User.hasMany(ChatMessage, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });
    ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });
    ChatMessage.belongsTo(User, { foreignKey: 'receiver_id', as: 'Receiver' });
}

module.exports = setupAssociations;