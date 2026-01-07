// ==================== НАСТРОЙКИ ====================
// ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ!
const GITHUB_USERNAME = 'swizerland25h-droid'; // Например: 'ivanov'
const GITHUB_REPO = 'NEMAX'; // Название репозитория
const GITHUB_TOKEN = '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'; // Ваш токен

// ==================== ПРОВЕРКА НАСТРОЕК ====================
console.log('Настройки:');
console.log('GitHub пользователь:', GITHUB_USERNAME);
console.log('Репозиторий:', GITHUB_REPO);
console.log('Токен есть?', GITHUB_TOKEN ? 'Да' : 'Нет');

// ==================== ПРОСТАЯ БАЗА ДАННЫХ ====================
class MessengerDB {
    constructor() {
        this.localData = null;
        this.isOnline = false;
        this.checkToken();
        this.loadLocal();
        this.init();
    }
    
    checkToken() {
        if (!GITHUB_TOKEN) {
            console.warn('⚠️ Внимание: токен не указан. Работаем локально.');
            return;
        }
        
        // Проверяем формат токена
        if (!GITHUB_TOKEN.startsWith('ghp_')) {
            console.warn('⚠️ Токен должен начинаться с ghp_');
        }
    }
    
    loadLocal() {
        const data = localStorage.getItem('messenger_data');
        if (data) {
            try {
                this.localData = JSON.parse(data);
                console.log('✅ Локальные данные загружены');
            } catch (e) {
                console.log('❌ Ошибка загрузки локальных данных');
            }
        }
        
        if (!this.localData) {
            this.createDemoData();
        }
    }
    
    createDemoData() {
        this.localData = {
            users: [
                { id: 'user1', username: 'user1', password: 'pass123' },
                { id: 'user2', username: 'user2', password: 'pass123' },
                { id: 'user3', username: 'user3', password: 'pass123' }
            ],
            friendships: [
                { id: 'f1', userId: 'user1', friendId: 'user2', accepted: true }
            ],
            groups: [
                { id: 'group1', name: 'Общий чат', creatorId: 'user1', members: ['user1', 'user2', 'user3'] }
            ],
            messages: [
                { id: 'msg1', senderId: 'user1', receiverId: 'user2', text: 'Привет!', timestamp: new Date().toISOString() }
            ],
            version: '1.0'
        };
        
        this.saveLocal();
        console.log('✅ Демо-данные созданы');
    }
    
    saveLocal() {
        localStorage.setItem('messenger_data', JSON.stringify(this.localData));
    }
    
    async init() {
        // Пробуем синхронизироваться с GitHub
        if (GITHUB_TOKEN) {
            try {
                console.log('🔄 Пробую подключиться к GitHub...');
                const canConnect = await this.testGitHubConnection();
                
                if (canConnect) {
                    this.isOnline = true;
                    console.log('✅ Подключено к GitHub');
                    
                    // Пробуем загрузить данные
                    await this.syncFromGitHub();
                } else {
                    console.log('⚠️ Не удалось подключиться к GitHub');
                }
            } catch (error) {
                console.log('❌ Ошибка подключения к GitHub:', error.message);
            }
        }
    }
    
    async testGitHubConnection() {
        try {
            // Простой запрос для проверки токена
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Токен рабочий. Пользователь:', userData.login);
                return true;
            } else {
                console.log('❌ Ошибка токена:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ Сетевая ошибка:', error.message);
            return false;
        }
    }
    
    async syncFromGitHub() {
        try {
            const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/database.json`;
            
            console.log('🔄 Загружаю данные с GitHub...');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                // Файл существует - загружаем
                const data = await response.json();
                const content = atob(data.content.replace(/\n/g, ''));
                this.localData = JSON.parse(content);
                this.saveLocal();
                console.log('✅ Данные загружены с GitHub');
                return true;
                
            } else if (response.status === 404) {
                // Файла нет - создаем
                console.log('📁 Файла нет, создаю...');
                return await this.createGitHubFile();
                
            } else {
                console.log('❌ Ошибка GitHub:', response.status, await response.text());
                return false;
            }
        } catch (error) {
            console.log('❌ Ошибка синхронизации:', error.message);
            return false;
        }
    }
    
    async createGitHubFile() {
        try {
            const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/database.json`;
            const content = btoa(JSON.stringify(this.localData, null, 2));
            
            console.log('📝 Создаю файл на GitHub...');
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: 'Создание базы данных мессенджера',
                    content: content
                })
            });
            
            if (response.ok) {
                console.log('✅ Файл создан на GitHub');
                return true;
            } else {
                const errorData = await response.json();
                console.log('❌ Ошибка создания файла:', errorData);
                return false;
            }
        } catch (error) {
            console.log('❌ Ошибка создания файла:', error.message);
            return false;
        }
    }
    
    async saveToGitHub() {
        if (!this.isOnline || !GITHUB_TOKEN) {
            this.saveLocal();
            return false;
        }
        
        try {
            // Сначала получаем текущий файл
            const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/database.json`;
            
            const getResponse = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            
            if (!getResponse.ok) {
                // Если файла нет, создаем
                return await this.createGitHubFile();
            }
            
            const fileData = await getResponse.json();
            const sha = fileData.sha;
            
            // Обновляем файл
            const content = btoa(JSON.stringify(this.localData, null, 2));
            
            const putResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Обновление данных мессенджера',
                    content: content,
                    sha: sha
                })
            });
            
            if (putResponse.ok) {
                console.log('✅ Данные сохранены на GitHub');
                return true;
            } else {
                const errorData = await putResponse.json();
                console.log('❌ Ошибка сохранения:', errorData);
                return false;
            }
        } catch (error) {
            console.log('❌ Ошибка сохранения на GitHub:', error.message);
            return false;
        }
    }
    
    // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ДАННЫМИ ====================
    
    getUserByUsername(username) {
        if (!this.localData?.users) return null;
        return this.localData.users.find(user => user.username === username);
    }
    
    getUserById(id) {
        if (!this.localData?.users) return null;
        return this.localData.users.find(user => user.id === id);
    }
    
    validateUser(username, password) {
        const user = this.getUserByUsername(username);
        if (!user) return { success: false, message: 'Пользователь не найден' };
        if (user.password !== password) return { success: false, message: 'Неверный пароль' };
        return { success: true, user };
    }
    
    async addUser(username, password) {
        if (!this.localData.users) this.localData.users = [];
        
        if (this.localData.users.some(u => u.username === username)) {
            return { success: false, message: 'Пользователь уже существует' };
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password
        };
        
        this.localData.users.push(newUser);
        
        // Сохраняем
        this.saveLocal();
        const savedToCloud = await this.saveToGitHub();
        
        return { 
            success: true, 
            user: newUser,
            savedToCloud: savedToCloud
        };
    }
    
    getFriends(userId) {
        if (!this.localData?.friendships) return [];
        
        const friendships = this.localData.friendships.filter(f => 
            (f.userId === userId || f.friendId === userId) && f.accepted
        );
        
        const friendIds = friendships.map(f => 
            f.userId === userId ? f.friendId : f.userId
        );
        
        return this.localData.users.filter(user => friendIds.includes(user.id));
    }
    
    async addFriend(userId, friendUsername) {
        const friendUser = this.getUserByUsername(friendUsername);
        if (!friendUser) return { success: false, message: 'Пользователь не найден' };
        if (friendUser.id === userId) return { success: false, message: 'Нельзя добавить себя' };
        
        if (!this.localData.friendships) this.localData.friendships = [];
        
        // Проверяем, есть ли уже дружба
        const existing = this.localData.friendships.find(f => 
            (f.userId === userId && f.friendId === friendUser.id) || 
            (f.userId === friendUser.id && f.friendId === userId)
        );
        
        if (existing) {
            return { success: false, message: 'Уже в друзьях' };
        }
        
        this.localData.friendships.push({
            id: 'f_' + Date.now(),
            userId,
            friendId: friendUser.id,
            accepted: true
        });
        
        this.saveLocal();
        const savedToCloud = await this.saveToGitHub();
        
        return { 
            success: true, 
            message: 'Друг добавлен',
            savedToCloud: savedToCloud
        };
    }
    
    getPrivateMessages(user1Id, user2Id) {
        if (!this.localData?.messages) return [];
        
        return this.localData.messages.filter(msg => 
            (msg.senderId === user1Id && msg.receiverId === user2Id) ||
            (msg.senderId === user2Id && msg.receiverId === user1Id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    getGroupMessages(groupId) {
        if (!this.localData?.messages) return [];
        
        return this.localData.messages.filter(msg => msg.groupId === groupId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    async addMessage(senderId, receiverId, groupId, text) {
        if (!this.localData.messages) this.localData.messages = [];
        
        const newMessage = {
            id: 'msg_' + Date.now(),
            senderId,
            receiverId: groupId ? null : receiverId,
            groupId: groupId || null,
            text,
            timestamp: new Date().toISOString()
        };
        
        this.localData.messages.push(newMessage);
        
        // Сохраняем локально сразу
        this.saveLocal();
        
        // Пробуем сохранить на GitHub (в фоне)
        if (this.isOnline) {
            this.saveToGitHub().catch(() => {});
        }
        
        return newMessage;
    }
    
    async createGroup(name, creatorId, memberIds) {
        if (!this.localData.groups) this.localData.groups = [];
        
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }
        
        const newGroup = {
            id: 'group_' + Date.now(),
            name,
            creatorId,
            members: memberIds,
            createdAt: new Date().toISOString()
        };
        
        this.localData.groups.push(newGroup);
        
        this.saveLocal();
        const savedToCloud = await this.saveToGitHub();
        
        return { 
            success: true, 
            group: newGroup,
            savedToCloud: savedToCloud
        };
    }
    
    getUserGroups(userId) {
        if (!this.localData?.groups) return [];
        return this.localData.groups.filter(group => group.members.includes(userId));
    }
    
    getGroupById(id) {
        if (!this.localData?.groups) return null;
        return this.localData.groups.find(group => group.id === id);
    }
    
    // ==================== СИНХРОНИЗАЦИЯ ====================
    
    async syncWithGitHub() {
        console.log('🔄 Синхронизация с GitHub...');
        
        if (!GITHUB_TOKEN) {
            return { success: false, message: '❌ Токен не указан' };
        }
        
        try {
            const result = await this.syncFromGitHub();
            
            if (result) {
                return { success: true, message: '✅ Данные синхронизированы!' };
            } else {
                return { success: false, message: '❌ Не удалось синхронизировать' };
            }
        } catch (error) {
            console.log('❌ Ошибка синхронизации:', error);
            return { success: false, message: '❌ Ошибка: ' + error.message };
        }
    }
    
    exportData() {
        return JSON.stringify(this.localData, null, 2);
    }
    
    async importData(jsonString) {
        try {
            const newData = JSON.parse(jsonString);
            this.localData = newData;
            this.saveLocal();
            
            const savedToCloud = await this.saveToGitHub();
            
            return { 
                success: true, 
                message: savedToCloud ? '✅ Данные импортированы в облако' : '✅ Данные импортированы локально',
                savedToCloud: savedToCloud
            };
        } catch (error) {
            return { success: false, message: '❌ Ошибка импорта: ' + error.message };
        }
    }
}

// ==================== ОСНОВНОЕ ПРИЛОЖЕНИЕ ====================
class MessengerApp {
    constructor() {
        console.log('🚀 Запуск мессенджера...');
        
        this.db = new MessengerDB();
        this.currentUser = null;
        this.currentChat = null;
        
        // Даем время на инициализацию БД
        setTimeout(() => {
            this.init();
        }, 500);
    }
    
    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.showSyncButton();
    }
    
    showSyncButton() {
        // Удаляем старую кнопку если есть
        const oldBtn = document.getElementById('sync-btn');
        if (oldBtn) oldBtn.remove();
        
        // Создаем новую кнопку
        const syncBtn = document.createElement('button');
        syncBtn.id = 'sync-btn';
        syncBtn.className = 'btn-icon';
        syncBtn.innerHTML = '🔄';
        syncBtn.title = 'Синхронизировать с облаком';
        syncBtn.style.marginLeft = '10px';
        
        syncBtn.addEventListener('click', async () => {
            this.showNotification('🔄 Синхронизация...');
            const result = await this.db.syncWithGitHub();
            this.showNotification(result.message);
            
            if (result.success) {
                this.loadFriends();
                this.loadGroups();
                this.loadChats();
                if (this.currentChat) this.loadMessages();
            }
        });
        
        // Добавляем кнопку в заголовок
        const header = document.querySelector('.sidebar-header');
        if (header) {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                header.insertBefore(syncBtn, logoutBtn);
            } else {
                header.appendChild(syncBtn);
            }
        }
    }
    
    checkAuth() {
        const savedUser = localStorage.getItem('messenger_currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showMainScreen();
            } catch (e) {
                this.showAuthScreen();
            }
        } else {
            this.showAuthScreen();
        }
    }
    
    showAuthScreen() {
        document.getElementById('auth-screen')?.classList.remove('hidden');
        document.getElementById('main-screen')?.classList.add('hidden');
    }
    
    showMainScreen() {
        document.getElementById('auth-screen')?.classList.add('hidden');
        document.getElementById('main-screen')?.classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('current-username').textContent = this.currentUser.username;
        }
        
        this.loadFriends();
        this.loadGroups();
        this.loadChats();
    }
    
    setupEventListeners() {
        // Основные кнопки
        document.getElementById('login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('register-btn')?.addEventListener('click', () => this.register());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('add-friend-btn')?.addEventListener('click', () => this.showAddFriendModal());
        document.getElementById('create-group-btn')?.addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('new-chat-btn')?.addEventListener('click', () => this.showNewChatModal());
        document.getElementById('send-message-btn')?.addEventListener('click', () => this.sendMessage());
        
        // Поле ввода сообщений
        document.getElementById('message-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Вкладки
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });
        
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.sidebar-tab').dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Модальные окна
        this.setupModals();
    }
    
    setupModals() {
        // Добавление друга
        document.getElementById('confirm-add-friend')?.addEventListener('click', () => this.addFriend());
        document.getElementById('cancel-add-friend')?.addEventListener('click', () => this.closeModal('add-friend-modal'));
        
        // Создание группы
        document.getElementById('confirm-create-group')?.addEventListener('click', () => this.createGroup());
        document.getElementById('cancel-create-group')?.addEventListener('click', () => this.closeModal('create-group-modal'));
        
        // Новый чат
        document.getElementById('confirm-new-chat')?.addEventListener('click', () => this.startNewChat());
        document.getElementById('cancel-new-chat')?.addEventListener('click', () => this.closeModal('new-chat-modal'));
        
        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.add('hidden');
            });
        });
    }
    
    login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        if (!username || !password) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        const result = this.db.validateUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('messenger_currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            this.showNotification('✅ Вход выполнен!');
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    async register() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const errorElement = document.getElementById('register-error');
        
        if (!username || !password || !confirmPassword) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        if (password !== confirmPassword) {
            errorElement.textContent = 'Пароли не совпадают';
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = 'Пароль минимум 6 символов';
            return;
        }
        
        const result = await this.db.addUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('messenger_currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            
            let message = '✅ Регистрация успешна!';
            if (result.savedToCloud === false) {
                message += ' (данные сохранены локально)';
            }
            this.showNotification(message);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    logout() {
        this.currentUser = null;
        this.currentChat = null;
        localStorage.removeItem('messenger_currentUser');
        this.showAuthScreen();
        this.showNotification('Вы вышли');
    }
    
    // ... остальные методы (addFriend, createGroup, loadFriends, и т.д.)
    // такие же как в предыдущем коде, не меняем их
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM загружен');
    window.app = new MessengerApp();
});

// Функции для отладки в консоли
window.testGitHub = async function() {
    console.log('=== ТЕСТ GITHUB ===');
    console.log('Пользователь:', GITHUB_USERNAME);
    console.log('Репозиторий:', GITHUB_REPO);
    console.log('Токен:', GITHUB_TOKEN ? 'есть' : 'нет');
    
    const db = new MessengerDB();
    const result = await db.syncWithGitHub();
    console.log('Результат:', result.message);
    
    if (!result.success) {
        console.log('💡 Советы по исправлению:');
        console.log('1. Проверьте правильность логина и названия репозитория');
        console.log('2. Убедитесь, что токен имеет права "repo"');
        console.log('3. Проверьте, что репозиторий существует');
        console.log('4. Попробуйте создать репозиторий вручную на GitHub');
    }
    
    return result;
};

window.exportData = function() {
    const db = new MessengerDB();
    const data = db.exportData();
    console.log('📋 Данные для экспорта:');
    console.log(data);
    
    // Копируем в буфер
    navigator.clipboard.writeText(data).then(() => {
        alert('✅ Данные скопированы в буфер!');
    }).catch(() => {
        prompt('Скопируйте этот код:', data);
    });
    
    return data;
};

window.importData = function(jsonString) {
    const db = new MessengerDB();
    const result = db.importData(jsonString);
    alert(result.message);
    if (result.success) {
        location.reload();
    }
};
