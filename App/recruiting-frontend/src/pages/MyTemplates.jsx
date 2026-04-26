import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Layout, Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import TemplateManager from './TemplateManager';

const MyTemplates = () => {
  const navigate = useNavigate();
  // Оставляем это имя, так как оно используется в верстке ниже
  const [dbTemplates, setDbTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Убедись, что этот роут возвращает массив шаблонов
        const res = await api.get('/templates/global');

        // Исправлено: вызываем правильный сеттер
        setDbTemplates(res.data);
      } catch (err) {
        console.error("Ошибка загрузки:", err);
      } finally {
        // Исправлено: выключаем индикатор загрузки
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const deleteTemplate = async (id) => {
    if (!window.confirm('Удалить этот шаблон?')) return;
    try {
      // Убедись, что роут на удаление тоже верный
      await api.delete(`/templates/${id}`);
      setDbTemplates(prev => prev.filter(t => (t.id || t.GlobalTemplateId) !== id));
    } catch (err) {
      alert('Не удалось удалить шаблон');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* КНОПКА ДОЛЖНА БЫТЬ ЗДЕСЬ — ВНЕ ЛЮБЫХ УСЛОВИЙ */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Управление этапами</h1>
          <p className="text-gray-500">Создавайте и редактируйте шаблоны чек-листов для ваших вакансий</p>
        </div>
        <Button onClick={() => navigate('/templates/create')} className="flex items-center gap-2">
          <Plus size={20} /> Создать шаблон
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={16} /> Быстрые пресеты
        </h2>
        <TemplateManager onSelect={(stages) => navigate('/templates/create', { state: { initialStages: stages } })} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Layout size={16} /> Ваши сохраненные шаблоны
        </h2>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
          </div>
        ) : dbTemplates.length === 0 ? (
          <Card className="text-center py-10 border-dashed border-2">
            <p className="text-gray-400">У вас пока нет сохраненных шаблонов</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {dbTemplates.map((t) => {
              const id = t.GlobalTemplateId || t.id;
              const name = t.name || t.stage_name;
              const itemsCount = t.GlobalTemplateItems?.length || 0;

              return (
                <Card key={id} className="group hover:border-blue-300 transition-all flex justify-between items-center p-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{name}</h3>
                      <p className="text-sm text-gray-500">{itemsCount} критериев</p>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/templates/edit/${id}`)}
                    >
                      <Edit3 size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTemplate(id)}
                      className="text-red-500"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyTemplates;