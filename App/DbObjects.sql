-- Таблица пользователей
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Профили пользователей (связь 1:1 с Users)
CREATE TABLE Profiles (
    UserId INT PRIMARY KEY,
    full_name NVARCHAR(255),
    phone NVARCHAR(50),
    avatar_url NVARCHAR(MAX),
    bio NVARCHAR(MAX),
    CONSTRAINT FK_Profiles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- Вакансии
CREATE TABLE Vacancies (
    VacancyId INT IDENTITY(1,1) PRIMARY KEY,
    recruiter_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    status NVARCHAR(50),
    CONSTRAINT FK_Vacancies_Users FOREIGN KEY (recruiter_id) REFERENCES Users(UserId)
);

-- Шаблоны этапов вакансий
CREATE TABLE CheckListTemplates (
    TemplateId INT IDENTITY(1,1) PRIMARY KEY,
    vacancy_id INT NOT NULL,
    stage_name NVARCHAR(255) NOT NULL,
    order_index INT NOT NULL,
    CONSTRAINT FK_Templates_Vacancies FOREIGN KEY (vacancy_id) REFERENCES Vacancies(VacancyId) ON DELETE CASCADE
);

-- Отклики на вакансии
CREATE TABLE Applications (
    ApplicationId INT IDENTITY(1,1) PRIMARY KEY,
    vacancy_id INT NOT NULL,
    candidate_id INT NOT NULL,
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Applications_Vacancies FOREIGN KEY (vacancy_id) REFERENCES Vacancies(VacancyId),
    CONSTRAINT FK_Applications_Users FOREIGN KEY (candidate_id) REFERENCES Users(UserId)
);

-- Прогресс кандидата
CREATE TABLE CandidateProgress (
    ProgressId INT IDENTITY(1,1) PRIMARY KEY,
    application_id INT NOT NULL,
    template_id INT NOT NULL,
    is_completed BIT DEFAULT 0,
    comment NVARCHAR(MAX),
    CONSTRAINT FK_Progress_Applications FOREIGN KEY (application_id) REFERENCES Applications(ApplicationId) ON DELETE CASCADE,
    CONSTRAINT FK_Progress_Templates FOREIGN KEY (template_id) REFERENCES CheckListTemplates(TemplateId)
);

-- Сообщения чата
CREATE TABLE ChatMessages (
    MessageId INT IDENTITY(1,1) PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text NVARCHAR(MAX) NOT NULL,
    sent_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Chat_Sender FOREIGN KEY (sender_id) REFERENCES Users(UserId),
    CONSTRAINT FK_Chat_Receiver FOREIGN KEY (receiver_id) REFERENCES Users(UserId)
);

-- Индексы для оптимизации
CREATE INDEX IX_Vacancies_Recruiter ON Vacancies(recruiter_id);
CREATE INDEX IX_Applications_Candidate ON Applications(candidate_id);
CREATE INDEX IX_Chat_Users ON ChatMessages(sender_id, receiver_id);