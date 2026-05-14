import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Plus, ListChecks, Briefcase, Send, ChevronLeft, GripVertical } from 'lucide-react';
import api from '../api';
import TemplateManager from './TemplateManager';

const CreateVacancy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    salary: '',
  });

  const [checklist, setChecklist] = useState([
    { id: 'stage-1', stage_name: 'Скрининг-созвон', items: [] },
    { id: 'stage-2', stage_name: 'Техническое интервью', items: [] }
  ]);

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Введите заголовок вакансии';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Заголовок должен содержать минимум 3 символа';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Введите город';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание требований';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Описание должно содержать минимум 10 символов';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    const validStages = checklist.filter(s => s.stage_name.trim() !== '');
    if (validStages.length === 0) {
      newErrors.checklist = 'Добавьте хотя бы один этап отбора';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyTemplate = (template) => {
    const templateItems = template.GlobalTemplateItems || [];
    const newStages = templateItems.map((item, idx) => ({
      id: `stage-${Date.now()}-${idx}`,
      stage_name: item.content || item,
      items: []
    }));
    if (newStages.length === 0) {
      newStages.push({ id: `stage-${Date.now()}`, stage_name: template.name || 'Новый этап', items: [] });
    }
    setChecklist(newStages);
  };

  const addStage = () => {
    setChecklist([...checklist, { id: `stage-${Date.now()}`, stage_name: '', items: [] }]);
  };

  const removeStage = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const updateStage = (index, value) => {
    const newChecklist = [...checklist];
    newChecklist[index].stage_name = value || '';
    setChecklist(newChecklist);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(checklist);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setChecklist(reordered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsSubmitting(true);
    try {
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
      <div className="flex items-center justify-center mb-8 gap-4">
        <div className={`h-2 w-24 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        <div className={`h-2 w-24 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {step === 1 ? (
          <Card className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Briefcase className="text-blue-600" /> Основная информация
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Заголовок вакансии *</label>
                  <input
                    className={`w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 transition-all ${errors.title ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    placeholder="Напр: Senior .NET Developer"
                    value={formData.title}
                    onChange={e => { setFormData({ ...formData, title: e.target.value }); setErrors(prev => ({ ...prev, title: '' })); }}
                  />
                  {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Город *</label>
                  <input
                    className={`w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 transition-all ${errors.city ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    placeholder="Минск"
                    value={formData.city}
                    onChange={e => { setFormData({ ...formData, city: e.target.value }); setErrors(prev => ({ ...prev, city: '' })); }}
                  />
                  {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
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
                <label className="text-sm font-bold text-gray-700">Описание требований *</label>
                <textarea
                  rows="5"
                  className={`w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 transition-all ${errors.description ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  placeholder="Опишите задачи и стек технологий..."
                  value={formData.description}
                  onChange={e => { setFormData({ ...formData, description: e.target.value }); setErrors(prev => ({ ...prev, description: '' })); }}
                />
                {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
              </div>
            </div>

            <Button
              type="button"
              className="w-full py-4 text-lg font-bold"
              onClick={() => { if (validateStep1()) setStep(2); }}
            >
              Далее: Настройка этапов
            </Button>
          </Card>
        ) : (
          <Card className="animate-in fade-in zoom-in-95 space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <ListChecks className="text-blue-600" /> Этапы отбора для кандидата
            </h2>

            <TemplateManager onSelect={handleApplyTemplate} />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">Этапы отбора *</label>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  {checklist.filter(s => s.stage_name.trim()).length} этапов • перетащите для изменения порядка
                </span>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="checklist">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {checklist.map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex gap-2 items-center p-1 rounded-xl transition-colors ${snapshot.isDragging ? 'bg-blue-50/50 ring-2 ring-blue-200 shadow-lg' : ''}`}
                            >
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
                                title="Перетащить"
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* Номер этапа */}
                              <div className="flex-none flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm border border-blue-100">
                                {index + 1}
                              </div>

                              {/* Название этапа */}
                              <input
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Название этапа..."
                                value={stage.stage_name}
                                onChange={(e) => updateStage(index, e.target.value)}
                              />

                              {/* Кнопка удаления */}
                              <button
                                type="button"
                                onClick={() => removeStage(index)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Удалить этап"
                              >
                                <Plus size={18} className="rotate-45" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {errors.checklist && <p className="text-red-500 text-xs">{errors.checklist}</p>}

              <button
                type="button"
                onClick={addStage}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Добавить этап
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