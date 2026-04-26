import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Save, ClipboardList } from 'lucide-react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const CreateTemplate = () => {
  const [stageName, setStageName] = useState('');
  const [items, setItems] = useState(['']); // Массив строк для пунктов чек-листа
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Если мы пришли из пресета, заполняем поля автоматически
    if (location.state?.initialStages) {
      setItems(location.state.initialStages);
    }
  }, [location]);
  // Добавить новое пустое поле для пункта
  const addItem = () => setItems([...items, '']);

  // Удалить конкретное поле
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : ['']); // Оставляем хотя бы одно поле
  };

  // Обновить текст в поле
  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!stageName.trim()) return alert('Введите название этапа');
    
    setLoading(true);
    try {
      // Отправляем данные на бэкенд
      // Роут должен соответствовать твоему бэкенду
      await api.post('/vacancies/templates/create', {
        stage_name: stageName,
        items: items.filter(item => item.trim() !== '') // Убираем пустые
      });
      
      alert('Шаблон успешно сохранен!');
      navigate('/templates'); // Укажи свой путь к списку шаблонов
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении шаблона');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="text-blue-600 w-8 h-8" />
        <h1 className="text-2xl font-bold text-gray-900">Создание шаблона этапа</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Название этапа"
            placeholder="Например: Техническое интервью или Soft Skills"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            required
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Пункты чек-листа
            </label>
            
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Пункт #${index + 1}`}
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed border-2 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Добавить критерий
            </Button>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8"
            >
              <Save size={18} /> {loading ? 'Сохранение...' : 'Сохранить шаблон'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateTemplate;