const {
    sequelize, User, Profile, Vacancy, CheckListTemplate,
    Application, CandidateProgress, Chat, ChatMessage,
    Interview, GlobalTemplate, GlobalTemplateItem,
    ApprovedCandidate, SavedVacancy
} = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await sequelize.sync({ force: true });
        console.log('✅ Tables recreated');

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('password123', salt);

        console.log('--- Start Seeding ---');

        // =====================================================================
        // 1. USERS
        // =====================================================================

        const admin = await User.create({
            email: 'admin@hirevich.by',
            password_hash: password,
            role: 'Admin',
            is_blocked: false
        });
        await Profile.create({
            UserId: admin.UserId,
            full_name: 'Admin Adminov',
            phone: '+375291111111',
            bio: 'Main administrator'
        });

        const admin2 = await User.create({
            email: 'admin2@hirevich.by',
            password_hash: password,
            role: 'Admin',
            is_blocked: false
        });
        await Profile.create({
            UserId: admin2.UserId,
            full_name: 'Second Admin',
            phone: '+375292222222',
            bio: 'Support service'
        });

        const blockedAdmin = await User.create({
            email: 'blockedadmin@hirevich.by',
            password_hash: password,
            role: 'Admin',
            is_blocked: true
        });
        await Profile.create({
            UserId: blockedAdmin.UserId,
            full_name: 'Blocked Admin',
            phone: '+375293333333'
        });

        const recruiter1 = await User.create({
            email: 'ivan.recruiter@company.com',
            password_hash: password,
            role: 'Recruiter',
            is_blocked: false
        });
        await Profile.create({
            UserId: recruiter1.UserId,
            full_name: 'Ivan Recruiterov',
            phone: '+375291111112',
            bio: 'Senior Recruiter at TechCorp'
        });

        const recruiter2 = await User.create({
            email: 'olga.recruiter@company.com',
            password_hash: password,
            role: 'Recruiter',
            is_blocked: false
        });
        await Profile.create({
            UserId: recruiter2.UserId,
            full_name: 'Olga Recruiterova',
            phone: '+375291111113',
            bio: 'HR specialist'
        });

        const blockedRecruiter = await User.create({
            email: 'blocked@company.com',
            password_hash: password,
            role: 'Recruiter',
            is_blocked: true
        });
        await Profile.create({
            UserId: blockedRecruiter.UserId,
            full_name: 'Blocked Recruiter',
            phone: '+375291111110'
        });

        const candidate1 = await User.create({
            email: 'alex.candidate@work.com',
            password_hash: password,
            role: 'Candidate',
            is_blocked: false
        });
        await Profile.create({
            UserId: candidate1.UserId,
            full_name: 'Aleksey Iskrov',
            phone: '+375292222223',
            bio: 'Frontend developer, 3 years experience, React/TypeScript'
        });

        const candidate2 = await User.create({
            email: 'maria.candidate@work.com',
            password_hash: password,
            role: 'Candidate',
            is_blocked: false
        });
        await Profile.create({
            UserId: candidate2.UserId,
            full_name: 'Maria Kodrova',
            phone: '+375293333334',
            bio: 'Backend developer, Python/Django, 5 years experience'
        });

        const candidate3 = await User.create({
            email: 'dmitry.candidate@mail.com',
            password_hash: password,
            role: 'Candidate',
            is_blocked: false
        });
        await Profile.create({
            UserId: candidate3.UserId,
            full_name: 'Dmitriy Testovich',
            phone: '+375294444444',
            bio: 'Junior QA, looking for first job'
        });

        const candidate4 = await User.create({
            email: 'anna.candidate@gmail.com',
            password_hash: password,
            role: 'Candidate',
            is_blocked: false
        });
        await Profile.create({
            UserId: candidate4.UserId,
            full_name: 'Anna Novichkova',
            phone: '+375295555555',
            bio: 'UI/UX Designer'
        });

        const blockedCandidate = await User.create({
            email: 'blocked.candidate@mail.com',
            password_hash: password,
            role: 'Candidate',
            is_blocked: true
        });
        await Profile.create({
            UserId: blockedCandidate.UserId,
            full_name: 'Blocked Candidate'
        });

        console.log('✅ Users created: 2 admins, 3 recruiters, 5 candidates (1 blocked each role)');

        // =====================================================================
        // 2. VACANCIES
        // =====================================================================

        const vacancy1 = await Vacancy.create({
            title: 'Node.js Developer',
            description: 'Looking for experienced Node.js developer. Stack: Node.js, Express, PostgreSQL, Redis.',
            city: 'Minsk',
            salary: '$2500',
            recruiter_id: recruiter1.UserId
        });

        const vacancy2 = await Vacancy.create({
            title: 'React Frontend Developer',
            description: 'Looking for React/TypeScript frontend developer for SPA applications.',
            city: 'Minsk',
            salary: '$2000',
            recruiter_id: recruiter1.UserId
        });

        const vacancy3 = await Vacancy.create({
            title: 'Python Backend Engineer',
            description: 'Python developer for ML projects. Django/FastAPI, Docker, AWS.',
            city: 'Gomel',
            salary: '$3000',
            recruiter_id: recruiter2.UserId
        });

        const vacancy4 = await Vacancy.create({
            title: 'QA Engineer',
            description: 'Manual and automated testing of web applications.',
            city: 'Brest',
            salary: '$1500',
            recruiter_id: recruiter2.UserId
        });

        const vacancy5 = await Vacancy.create({
            title: 'Fullstack Developer',
            description: 'Full cycle: React + Node.js + MongoDB. Remote work.',
            city: 'Remote',
            salary: '$2800',
            recruiter_id: recruiter1.UserId
        });

        const vacancy6 = await Vacancy.create({
            title: 'DevOps Engineer',
            description: 'CI/CD, Docker, Kubernetes, AWS.',
            city: 'Minsk',
            salary: '$2700',
            recruiter_id: recruiter2.UserId
        });

        const vacancy7 = await Vacancy.create({
            title: 'Junior Frontend Developer',
            description: 'Entry-level frontend developer position.',
            city: 'Minsk',
            salary: '$1000',
            recruiter_id: recruiter1.UserId
        });

        console.log('✅ Vacancies created: 7');

        // =====================================================================
        // 3. CHECKLIST TEMPLATES
        // =====================================================================

        await CheckListTemplate.bulkCreate([
            { stage_name: 'Resume Screening', order_index: 1, vacancy_id: vacancy1.VacancyId },
            { stage_name: 'Technical Interview', order_index: 2, vacancy_id: vacancy1.VacancyId },
            { stage_name: 'Test Task', order_index: 3, vacancy_id: vacancy1.VacancyId },
            { stage_name: 'Final Interview', order_index: 4, vacancy_id: vacancy1.VacancyId },
            { stage_name: 'Offer', order_index: 5, vacancy_id: vacancy1.VacancyId },

            { stage_name: 'Portfolio Review', order_index: 1, vacancy_id: vacancy2.VacancyId },
            { stage_name: 'Test Task', order_index: 2, vacancy_id: vacancy2.VacancyId },
            { stage_name: 'Interview', order_index: 3, vacancy_id: vacancy2.VacancyId },

            { stage_name: 'Phone Screening', order_index: 1, vacancy_id: vacancy3.VacancyId },
            { stage_name: 'Live Coding', order_index: 2, vacancy_id: vacancy3.VacancyId },
            { stage_name: 'System Design', order_index: 3, vacancy_id: vacancy3.VacancyId },

            { stage_name: 'Questionnaire', order_index: 1, vacancy_id: vacancy7.VacancyId },
            { stage_name: 'Test Task', order_index: 2, vacancy_id: vacancy7.VacancyId },
        ]);

        console.log('✅ Checklist templates created');

        // =====================================================================
        // 4. APPLICATIONS
        // =====================================================================

        // Статусы: Новый → На рассмотрении → Принято/Отклонено
        const app1 = await Application.create({
            vacancy_id: vacancy1.VacancyId,
            candidate_id: candidate1.UserId,
            status: 'Новый'          // кандидат только откликнулся
        });

        const app2 = await Application.create({
            vacancy_id: vacancy1.VacancyId,
            candidate_id: candidate2.UserId,
            status: 'Принято'        // рекрутер одобрил
        });

        const app3 = await Application.create({
            vacancy_id: vacancy2.VacancyId,
            candidate_id: candidate1.UserId,
            status: 'На рассмотрении' // рекрутер начал проверку
        });

        const app4 = await Application.create({
            vacancy_id: vacancy3.VacancyId,
            candidate_id: candidate2.UserId,
            status: 'Отклонено'       // рекрутер отклонил
        });

        const app5 = await Application.create({
            vacancy_id: vacancy4.VacancyId,
            candidate_id: candidate3.UserId,
            status: 'Новый'           // кандидат только откликнулся
        });

        const app6 = await Application.create({
            vacancy_id: vacancy5.VacancyId,
            candidate_id: candidate1.UserId,
            status: 'На рассмотрении' // рекрутер начал проверку
        });

        const app7 = await Application.create({
            vacancy_id: vacancy2.VacancyId,
            candidate_id: candidate3.UserId,
            status: 'Отклонено'       // рекрутер отклонил
        });

        console.log('✅ Applications created: 7');

        // =====================================================================
        // 5. CANDIDATE PROGRESS
        // =====================================================================

        // Получаем реальные ID шаблонов для каждой вакансии
        const v1Templates = await CheckListTemplate.findAll({
            where: { vacancy_id: vacancy1.VacancyId },
            order: [['order_index', 'ASC']]
        });
        const v4Templates = await CheckListTemplate.findAll({
            where: { vacancy_id: vacancy4.VacancyId },
            order: [['order_index', 'ASC']]
        });

        const progressData = [];

        // app1 (vacancy1) — первые 2 этапа пройдены
        if (v1Templates.length >= 2) {
            progressData.push({
                is_completed: true,
                comment: 'Resume received and reviewed',
                application_id: app1.ApplicationId,
                template_id: v1Templates[0].TemplateId
            });
            progressData.push({
                is_completed: true,
                comment: 'Technical interview passed',
                application_id: app1.ApplicationId,
                template_id: v1Templates[1].TemplateId
            });
        }

        // app2 (vacancy1) — все 5 этапов пройдены
        v1Templates.forEach((t, i) => {
            const comments = ['Excellent skills', 'Solved all tasks', 'Test task excellent', 'Final interview completed', 'Offer sent'];
            progressData.push({
                is_completed: true,
                comment: comments[i] || '',
                application_id: app2.ApplicationId,
                template_id: t.TemplateId
            });
        });

        // app5 (vacancy4) — первый этап не пройден
        if (v4Templates.length >= 1) {
            progressData.push({
                is_completed: false,
                comment: '',
                application_id: app5.ApplicationId,
                template_id: v4Templates[0].TemplateId
            });
        }

        if (progressData.length > 0) {
            await CandidateProgress.bulkCreate(progressData);
        }

        console.log('✅ Candidate progress created');

        // =====================================================================
        // 6. INTERVIEWS
        // =====================================================================

        await Interview.create({
            meeting_link: 'https://meet.google.com/abc-defg-hij',
            scheduled_at: new Date('2025-06-15T14:00:00Z'),
            status: 'scheduled',
            show_comments_to_candidate: false,
            application_id: app1.ApplicationId
        });

        await Interview.create({
            meeting_link: 'https://meet.google.com/xyz-123-456',
            scheduled_at: new Date('2025-06-16T10:00:00Z'),
            status: 'completed',
            show_comments_to_candidate: true,
            application_id: app2.ApplicationId
        });

        await Interview.create({
            meeting_link: 'https://meet.google.com/mmm-nnn-ooo',
            scheduled_at: new Date('2025-06-18T16:00:00Z'),
            status: 'scheduled',
            show_comments_to_candidate: false,
            application_id: app3.ApplicationId
        });

        console.log('✅ Interviews created');

        // =====================================================================
        // 7. GLOBAL TEMPLATES
        // =====================================================================

        const gt1 = await GlobalTemplate.create({
            name: 'Standard Backend',
            description: 'Template for backend positions',
            recruiter_id: recruiter1.UserId
        });

        await GlobalTemplateItem.bulkCreate([
            { content: 'Resume Screening', order_index: 0, global_template_id: gt1.GlobalTemplateId },
            { content: 'Technical Testing', order_index: 1, global_template_id: gt1.GlobalTemplateId },
            { content: 'Code Review', order_index: 2, global_template_id: gt1.GlobalTemplateId },
            { content: 'Team Lead Interview', order_index: 3, global_template_id: gt1.GlobalTemplateId },
            { content: 'HR Interview', order_index: 4, global_template_id: gt1.GlobalTemplateId },
            { content: 'Offer', order_index: 5, global_template_id: gt1.GlobalTemplateId }
        ]);

        const gt2 = await GlobalTemplate.create({
            name: 'Frontend Process',
            description: 'Template for frontend positions',
            recruiter_id: recruiter2.UserId
        });

        await GlobalTemplateItem.bulkCreate([
            { content: 'Portfolio Review', order_index: 0, global_template_id: gt2.GlobalTemplateId },
            { content: 'UI Test Task', order_index: 1, global_template_id: gt2.GlobalTemplateId },
            { content: 'Technical Interview', order_index: 2, global_template_id: gt2.GlobalTemplateId },
            { content: 'Final Interview', order_index: 3, global_template_id: gt2.GlobalTemplateId }
        ]);

        console.log('✅ Global templates created');

        // =====================================================================
        // 8. APPROVED CANDIDATES
        // =====================================================================

        await ApprovedCandidate.create({
            recruiter_id: recruiter1.UserId,
            candidate_id: candidate2.UserId,
            notes: 'Excellent React skills, strong recommendation'
        });

        await ApprovedCandidate.create({
            recruiter_id: recruiter1.UserId,
            candidate_id: candidate1.UserId,
            notes: 'Strong backend, good code quality'
        });

        await ApprovedCandidate.create({
            recruiter_id: recruiter2.UserId,
            candidate_id: candidate2.UserId,
            notes: 'Python guru, great system design'
        });

        console.log('✅ Approved candidates created');

        // =====================================================================
        // 9. SAVED VACANCIES
        // =====================================================================

        await SavedVacancy.create({ user_id: candidate1.UserId, vacancy_id: vacancy1.VacancyId });
        await SavedVacancy.create({ user_id: candidate1.UserId, vacancy_id: vacancy3.VacancyId });
        await SavedVacancy.create({ user_id: candidate2.UserId, vacancy_id: vacancy5.VacancyId });
        await SavedVacancy.create({ user_id: candidate3.UserId, vacancy_id: vacancy2.VacancyId });

        console.log('✅ Saved vacancies created');

        // =====================================================================
        // 10. CHATS & MESSAGES
        // =====================================================================

        const chat1 = await Chat.create({ application_id: app1.ApplicationId });
        const chat2 = await Chat.create({ application_id: app2.ApplicationId });

        await ChatMessage.bulkCreate([
            {
                message_text: 'Hello! We reviewed your resume.',
                sent_at: new Date('2025-06-01T10:00:00Z'),
                sender_id: recruiter1.UserId,
                chat_id: chat1.ChatId,
                is_system: false
            },
            {
                message_text: 'Thanks! When is the technical interview?',
                sent_at: new Date('2025-06-01T10:15:00Z'),
                sender_id: candidate1.UserId,
                chat_id: chat1.ChatId,
                is_system: false
            },
            {
                message_text: 'Invitation sent, check your email.',
                sent_at: new Date('2025-06-01T10:30:00Z'),
                sender_id: recruiter1.UserId,
                chat_id: chat1.ChatId,
                is_system: false
            },
            {
                message_text: 'Hi! Your code was impressive.',
                sent_at: new Date('2025-06-02T09:00:00Z'),
                sender_id: recruiter1.UserId,
                chat_id: chat2.ChatId,
                is_system: false
            },
            {
                message_text: 'Great, what is the next step?',
                sent_at: new Date('2025-06-02T09:20:00Z'),
                sender_id: candidate2.UserId,
                chat_id: chat2.ChatId,
                is_system: false
            }
        ]);

        console.log('✅ Chats and messages created');

        // =====================================================================
        // SUMMARY
        // =====================================================================

        const [userCount, vacancyCount, appCount, chatCount, templateCount] = await Promise.all([
            User.count(), Vacancy.count(), Application.count(), Chat.count(), GlobalTemplate.count()
        ]);

        console.log('');
        console.log('========== SEEDING COMPLETE ==========');
        console.log(`  Users:           ${userCount}`);
        console.log(`  Vacancies:       ${vacancyCount}`);
        console.log(`  Applications:    ${appCount}`);
        console.log(`  Chats:           ${chatCount}`);
        console.log(`  Global Templates: ${templateCount}`);
        console.log('=====================================');
        console.log('');
        console.log('Test accounts:');
        console.log('  Admin:      admin@hirevich.by / password123');
        console.log('  Recruiter:  ivan.recruiter@company.com / password123');
        console.log('  Candidate:  alex.candidate@work.com / password123');
        console.log('');

    } catch (error) {
        console.error('❌ SEEDING ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
}

seed();