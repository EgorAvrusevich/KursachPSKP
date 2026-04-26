import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Plus, Trash2, ListChecks, Briefcase, Send, ChevronLeft, Sparkles } from 'lucide-react';
import api from '../api';

// Вспомогательный компонент для динамических шаблонов из БД
const TemplateManager = ({ onSelect }) => {
  const [dbTemplates, setDbTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/templates/global') // Твой новый роут для библиотеки
      .then(res => {
        setDbTemplates(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-blue-400 animate-pulse">Загрузка ваших шаблонов...</div>;

  return (
    <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
      <div className="flex items-center gap-2 text-blue-700 font-bold mb-3 text-sm">
        <Sparkles size={16} />
        <span>Ваши сохраненные шаблоны:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {dbTemplates.length > 0 ? (
          dbTemplates.map((t) => (
            <button
              key={t.GlobalTemplateId}
              type="button"
              onClick={() => onSelect(t.name)} // Просто добавляем имя этапа
              className="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              + {t.name}
            </button>
          ))
        ) : (
          <p className="text-xs text-blue-400 italic">У вас пока нет глобальных шаблонов</p>
        )}
      </div>
    </div>
  );
};

const CreateVacancy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    salary: '',
  });

  const [checklist, setChecklist] = useState([
    { stage_name: 'Скрининг-созвон' },
    { stage_name: 'Техническое интервью' }
  ]);

  // Добавление этапа из шаблона в текущий список
  const addFromTemplate = (stageName) => {
    setChecklist([...checklist, { stage_name: stageName }]);
  };

  const addStage = () => setChecklist([...checklist, { stage_name: '' }]);
  const removeStage = (index) => setChecklist(checklist.filter((_, i) => i !== index));
  const updateStage = (index, value) => {
    const newChecklist = [...checklist];
    newChecklist[index].stage_name = value;
    setChecklist(newChecklist);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Отправляем на новый эндпоинт, который мы обсудили
      await api.post('/vacancies/create-with-checklist', { 
        ...formData, 
        checklist: checklist.filter(s => s.stage_name.trim() !== '') 
      });
      
      navigate('/my-vacancies');
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Индикатор прогресса */}
      <div className="flex items-center justify-center mb-8 gap-4">
        <div className={`h-2 w-24 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        <div className={`h-2 w-24 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? (
          /* ЭТАП 1: ОБЩИЕ ДАННЫЕ */
          <Card className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Briefcase className="text-blue-600" /> Основная информация
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Заголовок вакансии</label>
                  <input
                    required
                    className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Напр: Senior .NET Developer"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Город</label>
                  <input
                    required
                    className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Минск"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Зарплатная вилка</label>
                <input
                  className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="2000$ - 3500$"
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Описание требований</label>
                <textarea
                  required
                  rows="5"
                  className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Опишите задачи и стек технологий..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full py-4 text-lg font-bold"
              onClick={() => setStep(2)}
              disabled={!formData.title || !formData.description}
            >
              Далее: Настройка этапов
            </Button>
          </Card>
        ) : (
          /* ЭТАП 2: ЧЕК-ЛИСТ */
          <Card className="animate-in fade-in zoom-in-95 space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
               <ListChecks className="text-blue-600" /> Этапы отбора для кандидата
            </h2>

            <TemplateManager onSelect={addFromTemplate} />

            <div className="space-y-3">
              {checklist.map((stage, index) => (
                <div key={index} className="flex gap-2 items-center animate-in slide-in-from-left-2">
                  <div className="flex-none bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold border border-blue-100">
                    {index + 1}
                  </div>
                  <input
                    required
                    className="flex-grow px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Название этапа (напр. Лайв-кодинг)..."
                    value={stage.stage_name}
                    onChange={(e) => updateStage(index, e.target.value)}
                  />
                  {checklist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addStage}
                className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
              >
                <Plus size={18} /> Добавить кастомный этап
              </button>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-grow flex items-center justify-center gap-2"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={18} /> Назад
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-grow bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                {isSubmitting ? 'Публикация...' : <><Send size={18} /> Опубликовать вакансию</>}
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
};

export default CreateVacancy;