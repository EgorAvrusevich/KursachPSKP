import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Save, ClipboardList, ChevronLeft } from 'lucide-react';
import api from '../api';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';

const CreateTemplate = () => {
  const { id } = useParams(); 
  const isEditMode = Boolean(id);
  
  const [templateName, setTemplateName] = useState('');
  const [items, setItems] = useState(['']); 
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode); 
  
  const navigate = useNavigate();
  const location = useLocation();

  // 1. ПОДГРУЗКА ДАННЫХ ПРИ РЕДАКТИРОВАНИИ
  useEffect(() => {
    const fetchTemplateData = async () => {
      if (!isEditMode) return;
      
      try {
        const res = await api.get(`/templates/global/${id}`);
        // Используем те же имена полей, что и в контроллере (name)
        setTemplateName(res.data.name || '');
        
        if (res.data.GlobalTemplateItems && res.data.GlobalTemplateItems.length > 0) {
          setItems(res.data.GlobalTemplateItems.map(item => item.content));
        } else {
          setItems(['']);
        }
      } catch (err) {
        console.error("Ошибка при загрузке шаблона:", err);
        alert("Не удалось загрузить данные шаблона");
        navigate('/templates/my');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTemplateData();
  }, [id, isEditMode, navigate]);

  // Поддержка пресетов из TemplateManager (только для режима создания)
  useEffect(() => {
    if (location.state?.initialStages && !isEditMode) {
      setItems(location.state.initialStages);
    }
  }, [location, isEditMode]);

  const addItem = () => setItems([...items, '']);

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : ['']);
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanItems = items.filter(item => item.trim() !== '');
    
    if (!templateName.trim()) return alert('Введите название шаблона');
    if (cleanItems.length === 0) return alert('Добавьте хотя бы один критерий');
    
    setLoading(true);
    try {
      const payload = {
        name: templateName,
        items: cleanItems
      };

      if (isEditMode) {
        await api.put(`/templates/global/${id}`, payload);
      } else {
        await api.post('/templates/create', payload);
      }
      
      // ПО ЗАВЕРШЕНИЮ: редирект на список
      navigate('/templates/my'); 
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка при сохранении шаблона');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <div className="animate-spin mb-4 text-blue-600">
          <ClipboardList size={40} />
        </div>
        <p className="animate-pulse">Синхронизация данных...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
             <ClipboardList className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Редактирование стандарта' : 'Новый стандарт этапа'}
          </h1>
        </div>
        <Link to="/my-templates" className="text-sm font-medium text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> к списку
        </Link>
      </div>

      <Card className="p-6 border-none shadow-xl shadow-blue-50/50 ring-1 ring-gray-100">
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Название шаблона (стандарта)"
            placeholder="Напр: Техническое интервью (Node.js)"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            className="text-lg font-semibold"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-gray-700">
                  Критерии оценки / Пункты
                </label>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-300">
                   {cleanItemsCount(items)} активных
                </span>
            </div>
            
            <div className="space-y-3">
                {items.map((item, index) => (
                <div key={index} className="flex gap-2 group items-center">
                    <div className="flex-none flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 font-mono text-xs border border-gray-100">
                        {index + 1}
                    </div>
                    <input
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-700"
                        placeholder={`Критерий оценки #${index + 1}`}
                        value={item}
                        onChange={(e) => updateItem(index, e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:hidden"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm font-medium hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Добавить пункт оценки
            </button>
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">Сохранение...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={18} /> {isEditMode ? 'Обновить изменения' : 'Зафиксировать шаблон'}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Хелпер для счетчика
const cleanItemsCount = (items) => items.filter(i => i.trim() !== '').length;

export default CreateTemplate;