import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Plus, Trash2, ListChecks, Briefcase, Send, ChevronLeft, Sparkles } from 'lucide-react';
import api from '../api';
import TemplateManager from './TemplateManager';

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
    { stage_name: 'Скрининг-созвон', items: [] },
    { stage_name: 'Техническое интервью', items: [] }
  ]);

  const handleApplyTemplate = (template) => {
    const templateItems = template.GlobalTemplateItems || [];

    // Если каждый элемент шаблона — это отдельный этап:
    const newStages = templateItems.map(item => ({
      stage_name: item.content || item, // Название этапа берем из контента
      items: [] // Пока создаем этапы без внутренних критериев
    }));

    // Если в шаблоне НЕТ элементов, но мы нажали на него, 
    // то хотя бы добавим название самого шаблона как этап (на всякий случай)
    if (newStages.length === 0) {
      newStages.push({
        stage_name: template.name || 'Новый этап',
        items: []
      });
    }

    // ПЕРЕЗАПИСЫВАЕМ весь чек-лист на массив НОВЫХ этапов
    setChecklist(newStages);
  };

  const addStage = () => setChecklist([...checklist, { stage_name: '', items: [] }]);

  const removeStage = (index) => setChecklist(checklist.filter((_, i) => i !== index));

  const updateStage = (index, value) => {
    const newChecklist = [...checklist];
    // Гарантируем, что значение не undefined для избежания ошибки в консоли
    newChecklist[index].stage_name = value || '';
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

            <TemplateManager onSelect={handleApplyTemplate} />

            <div className="space-y-3">
              {checklist.map((stage, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-center animate-in slide-in-from-left-2">
                    <div className="flex-none bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold border border-blue-100">
                      {index + 1}
                    </div>
                    <div className="relative flex-grow">
                      <input
                        required
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-20"
                        placeholder="Название этапа..."
                        value={stage.stage_name}
                        onChange={(e) => updateStage(index, e.target.value)}
                      />
                      {stage.items?.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                          <ListChecks size={12} /> {stage.items.length} критериев
                        </div>
                      )}
                    </div>
                    {/* Кнопка удаления */}
                  </div>
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