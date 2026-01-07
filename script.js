// ==================== НАСТРОЙКИ ====================
const GITHUB_USERNAME = 'switzerland25h-droid'; // Замените на ваш логин
const GITHUB_REPO = 'NEMAX'; // Замените на название репозитория
const GITHUB_TOKEN = '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'; // Можно оставить пустым для публичного репозитория

// ==================== БАЗА ДАННЫХ НА GITHUB ====================
class GitHubDB {
    constructor() {
        this.data = null;
        this.filePath = 'database.json';
        this.branch = 'main';
        this.baseUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;
        this.init();
    }
    
    async init() {
        // Сначала пробуем загрузить из localStorage
        const localData = localStorage.getItem('messenger_data');
        if (localData) {
            try {
                this.data = JSON.parse(localData);
            } catch (e) {
                console.log('Ошибка загрузки локальных данных');
            }
        }
        
        // Пробуем загрузить с GitHub
        try {
            await this.loadFromGitHub();
        } catch (error) {
            console.log('GitHub недоступен, работаем локально');
            if (!this.data) {
                this.createDemoData();
            }
        }
    }
    
    createDemoData() {
        this.data = {
            users: [
                { 
                    id: 'user1',
                    username: 'user1', 
                    password: 'pass123',
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'user2',
                    username: 'user2', 
                    password: 'pass123',
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'user3',
                    username: 'user3', 
                    password: 'pass123',
                    createdAt: new Date().toISOString()
                }
            ],
            friendships: [],
            groups: [],
            messages: [],
            lastUpdated: new Date().toISOString()
        };
        this.saveToLocalStorage();
    }
    
    saveToLocalStorage() {
        localStorage.setItem('messenger_data', JSON.stringify(this.data));
    }
    
    async loadFromGitHub() {
        try {
            const url = `${this.baseUrl}/${this.filePath}`;
            const headers = {};
            
            if (GITHUB_TOKEN) {
                headers['Authorization'] = `token ${GITHUB_TOKEN}`;
            }
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error('Файл не найден на GitHub');
            }
            
            const fileData = await response.json();
            const content = atob(fileData.content); // Декодируем base64
            this.data = JSON.parse(content);
            this.saveToLocalStorage();
            
            console.log('Данные загружены с GitHub');
            return this.data;
        } catch (error) {
            console.log('Ошибка загрузки с GitHub:', error.message);
            
            // Если файла нет, создаем его
            if (error.message.includes('не найден')) {
                await this.createFileOnGitHub();
            }
            
            throw error;
        }
    }
    
    async createFileOnGitHub() {
        if (!GITHUB_TOKEN) {
            console.log('Для создания файла нужен GitHub токен');
            return null;
        }
        
        this.createDemoData();
        const content = btoa(JSON.stringify(this.data, null, 2));
        
        const response = await fetch(`${this.baseUrl}/${this.filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Создание файла базы данных',
                content: content,
                branch: this.branch
            })
        });
        
        if (response.ok) {
            console.log('Файл создан на GitHub');
            return await response.json();
        } else {
            throw new Error('Не удалось создать файл');
        }
    }
    
    async saveToGitHub() {
        if (!GITHUB_TOKEN) {
            console.log('Для сохранения на GitHub нужен токен');
            this.saveToLocalStorage();
            return false;
        }
        
        this.data.lastUpdated = new Date().toISOString();
        const content = btoa(JSON.stringify(this.data, null, 2));
        
        try {
            // Сначала получаем текущий файл, чтобы узнать его SHA
            const getResponse = await fetch(`${this.baseUrl}/${this.filePath}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });
            
            if (!getResponse.ok) {
                throw new Error('Файл не найден');
            }
            
            const fileData = await getResponse.json();
            const sha = fileData.sha;
            
            // Обновляем файл
            const putResponse = await fetch(`${this.baseUrl}/${this.filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Обновление базы данных',
                    content: content,
                    sha: sha,
                    branch: this.branch
                })
            });
            
            if (putResponse.ok) {
                console.log('Данные сохранены на GitHub');
                this.saveToLocalStorage();
                return true;
            } else {
                throw new Error('Не удалось сохранить');
            }
        } catch (error) {
            console.log('Ошибка сохранения на GitHub:', error.message);
            this.saveToLocalStorage();
            return false;
        }
    }
    
    // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ДАННЫМИ ====================
    
    getUsers() {
        return this.data?.users || [];
    }
    
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }
    
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }
    
    async addUser(username, password) {
        const users = this.getUsers();
        
        if (users.some(user => user.username === username)) {
            return { success: false, message: 'Пользователь уже существует' };
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        this.data.users = users;
        
        const saved = await this.saveToGitHub();
        
        return { 
            success: true, 
            user: newUser,
            savedToCloud: saved
        };
    }
    
    validateUser(username, password) {
        const user = this.getUserByUsername(username);
        
        if (!user) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (user.password !== password) {
            return { success: false, message: 'Неверный пароль' };
        }
        
        return { success: true, user };
    }
    
    getFriendships() {
        return this.data?.friendships || [];
    }
    
    getFriends(userId) {
        const friendships = this.getFriendships();
        const users = this.getUsers();
        
        const friendIds = friendships
            .filter(f => (f.userId === userId || f.friendId === userId) && f.accepted)
            .map(f => f.userId === userId ? f.friendId : f.friendId === userId ? f.userId : null)
            .filter(id => id !== null);
        
        return friendIds.map(id => users.find(user => user.id === id)).filter(user => user);
    }
    
    async addFriend(userId, friendUsername) {
        const friendUser = this.getUserByUsername(friendUsername);
        
        if (!friendUser) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (friendUser.id === userId) {
            return { success: false, message: 'Нельзя добавить себя' };
        }
        
        const friendships = this.getFriendships();
        
        const existing = friendships.find(f => 
            (f.userId === userId && f.friendId === friendUser.id) || 
            (f.userId === friendUser.id && f.friendId === userId)
        );
        
        if (existing) {
            if (existing.accepted) {
                return { success: false, message: 'Уже в друзьях' };
            }
            if (existing.userId === userId) {
                return { success: false, message: 'Запрос уже отправлен' };
            }
            existing.accepted = true;
            this.data.friendships = friendships;
            const saved = await this.saveToGitHub();
            return { 
                success: true, 
                message: 'Запрос принят',
                savedToCloud: saved
            };
        }
        
        friendships.push({
            id: 'f_' + Date.now(),
            userId,
            friendId: friendUser.id,
            accepted: false
        });
        
        this.data.friendships = friendships;
        const saved = await this.saveToGitHub();
        
        return { 
            success: true, 
            message: 'Запрос отправлен',
            savedToCloud: saved
        };
    }
    
    getGroups() {
        return this.data?.groups || [];
    }
    
    getGroupById(id) {
        const groups = this.getGroups();
        return groups.find(group => group.id === id);
    }
    
    getUserGroups(userId) {
        const groups = this.getGroups();
        return groups.filter(group => group.members.includes(userId));
    }
    
    async createGroup(name, creatorId, memberIds) {
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }
        
        const groups = this.getGroups();
        const newGroup = {
            id: 'group_' + Date.now(),
            name,
            creatorId,
            members: memberIds,
            createdAt: new Date().toISOString()
        };
        
        groups.push(newGroup);
        this.data.groups = groups;
        
        const saved = await this.saveToGitHub();
        
        return { 
            success: true, 
            group: newGroup,
            savedToCloud: saved
        };
    }
    
    getMessages() {
        return this.data?.messages || [];
    }
    
    getPrivateMessages(user1Id, user2Id) {
        const messages = this.getMessages();
        return messages.filter(msg => 
            (msg.senderId === user1Id && msg.receiverId === user2Id) ||
            (msg.senderId === user2Id && msg.receiverId === user1Id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    getGroupMessages(groupId) {
        const messages = this.getMessages();
        return messages.filter(msg => msg.groupId === groupId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    async addMessage(senderId, receiverId, groupId, text) {
        const messages = this.getMessages();
        const newMessage = {
            id: 'msg_' + Date.now(),
            senderId,
            receiverId: groupId ? null : receiverId,
            groupId: groupId || null,
            text,
            timestamp: new Date().toISOString()
        };
        
        messages.push(newMessage);
        this.data.messages = messages;
        
        // Сохраняем локально сразу, на GitHub - в фоне
        this.saveToLocalStorage();
        this.saveToGitHub().catch(() => {
            console.log('Не удалось сохранить сообщение в облако');
        });
        
        return newMessage;
    }
    
    // Экспорт/импорт
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
    
    async importData(jsonString) {
        try {
            const newData = JSON.parse(jsonString);
            
            if (!newData.users || !newData.friendships || !newData.groups || !newData.messages) {
                return { success: false, message: 'Неправильный формат' };
            }
            
            this.data = newData;
            this.saveToLocalStorage();
            
            const saved = await this.saveToGitHub();
            
            return { 
                success: true, 
                message: saved ? 'Данные импортированы и сохранены в облако' : 'Данные импортированы локально',
                savedToCloud: saved
            };
        } catch (error) {
            return { success: false, message: 'Ошибка импорта: ' + error.message };
        }
    }
    
    // Синхронизация с GitHub
    async syncWithGitHub() {
        try {
            await this.loadFromGitHub();
            return { success: true, message: 'Данные синхронизированы с облаком' };
        } catch (error) {
            return { success: false, message: 'Не удалось синхронизировать: ' + error.message };
        }
    }
}

// ==================== ОСНОВНОЕ ПРИЛОЖЕНИЕ ====================
class MessengerApp {
    constructor() {
        this.db = new GitHubDB();
        this.currentUser = null;
        this.currentChat = null;
        
        this.init();
    }
    
    async init() {
        // Ждем загрузки базы данных
        setTimeout(() => {
            this.checkAuth();
        }, 500);
        
        this.setupEventListeners();
        this.setupModals();
        
        // Показываем статус синхронизации
        this.showSyncStatus();
    }
    
    showSyncStatus() {
        // Проверяем, есть ли токен
        const hasToken = GITHUB_TOKEN !== '';
        const status = document.createElement('div');
        status.id = 'sync-status';
        status.className = 'sync-status';
        status.innerHTML = `
            <span>${hasToken ? '🟢 Облачная синхронизация' : '🟡 Локальный режим'}</span>
            <button id="sync-btn" class="btn-icon small">
                <i class="fas fa-sync-alt"></i>
            </button>
        `;
        
        document.querySelector('.sidebar-header').appendChild(status);
        
        // Кнопка синхронизации
        document.getElementById('sync-btn').addEventListener('click', async () => {
            const result = await this.db.syncWithGitHub();
            this.showNotification(result.message);
            
            if (result.success) {
                this.loadFriends();
                this.loadGroups();
                this.loadChats();
                if (this.currentChat) {
                    this.loadMessages();
                }
            }
        });
    }
    
    checkAuth() {
        const savedUser = localStorage.getItem('messenger_currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showMainScreen();
            } catch (e) {
                localStorage.removeItem('messenger_currentUser');
                this.showAuthScreen();
            }
        } else {
            this.showAuthScreen();
        }
    }
    
    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }
    
    showMainScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        document.getElementById('current-username').textContent = this.currentUser.username;
        
        this.loadFriends();
        this.loadGroups();
        this.loadChats();
    }
    
    setupEventListeners() {
        // Авторизация
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Вкладки авторизации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });
        
        // Вкладки боковой панели
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.sidebar-tab').dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Кнопки действий
        document.getElementById('add-friend-btn').addEventListener('click', () => this.showAddFriendModal());
        document.getElementById('create-group-btn').addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('new-chat-btn').addEventListener('click', () => this.showNewChatModal());
        
        // Отправка сообщений
        document.getElementById('send-message-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Меню пользователя
        const userMenuBtn = document.createElement('button');
        userMenuBtn.className = 'btn-icon';
        userMenuBtn.title = 'Меню';
        userMenuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        userMenuBtn.addEventListener('click', () => this.showUserMenu());
        document.querySelector('.sidebar-header').appendChild(userMenuBtn);
    }
    
    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="export">
                <i class="fas fa-download"></i> Экспорт данных
            </div>
            <div class="menu-item" data-action="import">
                <i class="fas fa-upload"></i> Импорт данных
            </div>
            <div class="menu-item" data-action="sync">
                <i class="fas fa-sync-alt"></i> Синхронизировать
            </div>
            <div class="menu-item" data-action="info">
                <i class="fas fa-info-circle"></i> Информация
            </div>
        `;
        
        // Позиционируем меню
        menu.style.position = 'absolute';
        menu.style.top = '60px';
        menu.style.right = '10px';
        menu.style.zIndex = '1000';
        
        document.querySelector('.sidebar').appendChild(menu);
        
        // Обработчики для пунктов меню
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                menu.remove();
                
                switch(action) {
                    case 'export':
                        this.showExportModal();
                        break;
                    case 'import':
                        this.showImportModal();
                        break;
                    case 'sync':
                        this.syncData();
                        break;
                    case 'info':
                        this.showInfo();
                        break;
                }
            });
        });
        
        // Закрытие меню при клике вне его
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== document.querySelector('.btn-icon[title="Меню"]')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }
    
    async syncData() {
        this.showNotification('Синхронизация...');
        const result = await this.db.syncWithGitHub();
        this.showNotification(result.message);
        
        if (result.success) {
            this.loadFriends();
            this.loadGroups();
            this.loadChats();
            if (this.currentChat) {
                this.loadMessages();
            }
        }
    }
    
    showExportModal() {
        const data = this.db.exportData();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Экспорт данных</h3>
                    <button class="btn-icon close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Скопируйте этот код для переноса данных:</p>
                    <textarea id="export-data" readonly>${data}</textarea>
                    <button id="copy-btn" class="btn btn-primary">Копировать</button>
                    <button id="download-btn" class="btn btn-secondary">Скачать файл</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Копирование
        modal.querySelector('#copy-btn').addEventListener('click', () => {
            const textarea = modal.querySelector('#export-data');
            textarea.select();
            document.execCommand('copy');
            this.showNotification('Скопировано!');
        });
        
        // Скачивание
        modal.querySelector('#download-btn').addEventListener('click', () => {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'messenger_data.json';
            a.click();
            URL.revokeObjectURL(url);
        });
        
        // Закрытие
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    showImportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Импорт данных</h3>
                    <button class="btn-icon close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Вставьте JSON код или выберите файл:</p>
                    <textarea id="import-data" placeholder="Вставьте JSON код..."></textarea>
                    <input type="file" id="import-file" accept=".json">
                    <div id="import-error" class="error"></div>
                </div>
                <div class="modal-footer">
                    <button id="confirm-import" class="btn btn-primary">Импортировать</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#confirm-import').addEventListener('click', async () => {
            const textarea = modal.querySelector('#import-data');
            const fileInput = modal.querySelector('#import-file');
            const errorElement = modal.querySelector('#import-error');
            
            let jsonString = textarea.value.trim();
            
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const result = await this.db.importData(e.target.result);
                    if (result.success) {
                        this.showNotification(result.message);
                        modal.remove();
                        location.reload();
                    } else {
                        errorElement.textContent = result.message;
                    }
                };
                reader.readAsText(file);
            } else if (jsonString) {
                const result = await this.db.importData(jsonString);
                if (result.success) {
                    this.showNotification(result.message);
                    modal.remove();
                    location.reload();
                } else {
                    errorElement.textContent = result.message;
                }
            } else {
                errorElement.textContent = 'Введите данные или выберите файл';
            }
        });
        
        // Закрытие
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    showInfo() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Информация</h3>
                    <button class="btn-icon close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <h4>Как работает синхронизация:</h4>
                    <p>1. Данные хранятся в вашем браузере (localStorage)</p>
                    <p>2. Для синхронизации между устройствами:</p>
                    <ul>
                        <li>Используйте кнопку "Синхронизировать"</li>
                        <li>Или экспортируйте данные и импортируйте на другом устройстве</li>
                    </ul>
                    <p>3. Для облачной синхронизации добавьте GitHub токен в код</p>
                    <p><strong>Демо-пользователи:</strong></p>
                    <p>user1 / pass123</p>
                    <p>user2 / pass123</p>
                    <p>user3 / pass123</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    setupModals() {
        // Добавление друга
        document.getElementById('confirm-add-friend').addEventListener('click', () => this.addFriend());
        document.getElementById('cancel-add-friend').addEventListener('click', () => this.closeModal('add-friend-modal'));
        
        // Создание группы
        document.getElementById('confirm-create-group').addEventListener('click', () => this.createGroup());
        document.getElementById('cancel-create-group').addEventListener('click', () => this.closeModal('create-group-modal'));
        
        // Новый чат
        document.getElementById('confirm-new-chat').addEventListener('click', () => this.startNewChat());
        document.getElementById('cancel-new-chat').addEventListener('click', () => this.closeModal('new-chat-modal'));
        
        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
    
    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.getElementById('login-form').classList.toggle('active', tab === 'login');
        document.getElementById('register-form').classList.toggle('active', tab === 'register');
        
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }
    
    switchSidebarTab(tab) {
        document.querySelectorAll('.sidebar-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-list`);
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
            this.showNotification('Вход выполнен!');
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
            
            let message = 'Регистрация успешна!';
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
    
    showAddFriendModal() {
        document.getElementById('add-friend-error').textContent = '';
        document.getElementById('friend-username').value = '';
        this.openModal('add-friend-modal');
    }
    
    async addFriend() {
        const friendUsername = document.getElementById('friend-username').value.trim();
        const errorElement = document.getElementById('add-friend-error');
        
        if (!friendUsername) {
            errorElement.textContent = 'Введите никнейм';
            return;
        }
        
        const result = await this.db.addFriend(this.currentUser.id, friendUsername);
        
        if (result.success) {
            this.closeModal('add-friend-modal');
            this.loadFriends();
            
            let message = result.message;
            if (result.savedToCloud === false) {
                message += ' (данные сохранены локально)';
            }
            this.showNotification(message);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    showCreateGroupModal() {
        document.getElementById('create-group-error').textContent = '';
        document.getElementById('group-name').value = '';
        
        const friends = this.db.getFriends(this.currentUser.id);
        const membersList = document.getElementById('group-members-list');
        membersList.innerHTML = '';
        
        if (friends.length === 0) {
            membersList.innerHTML = '<p>Нет друзей для группы</p>';
        } else {
            friends.forEach(friend => {
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-item';
                checkbox.innerHTML = `
                    <input type="checkbox" id="member-${friend.id}" value="${friend.id}">
                    <label for="member-${friend.id}">${friend.username}</label>
                `;
                membersList.appendChild(checkbox);
            });
        }
        
        this.openModal('create-group-modal');
    }
    
    async createGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        const errorElement = document.getElementById('create-group-error');
        
        if (!groupName) {
            errorElement.textContent = 'Введите название';
            return;
        }
        
        const checkboxes = document.querySelectorAll('#group-members-list input[type="checkbox"]:checked');
        const memberIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (memberIds.length === 0) {
            errorElement.textContent = 'Выберите участников';
            return;
        }
        
        const result = await this.db.createGroup(groupName, this.currentUser.id, memberIds);
        
        if (result.success) {
            this.closeModal('create-group-modal');
            this.loadGroups();
            
            let message = 'Группа создана!';
            if (result.savedToCloud === false) {
                message += ' (данные сохранены локально)';
            }
            this.showNotification(message);
            this.openChat('group', result.group.id);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    showNewChatModal() {
        document.getElementById('new-chat-error').textContent = '';
        
        const friends = this.db.getFriends(this.currentUser.id);
        const usersList = document.getElementById('new-chat-users-list');
        usersList.innerHTML = '';
        
        if (friends.length === 0) {
            usersList.innerHTML = '<p>Нет друзей для чата</p>';
        } else {
            friends.forEach(friend => {
                const item = document.createElement('div');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="radio" id="chat-user-${friend.id}" name="chat-user" value="${friend.id}">
                    <label for="chat-user-${friend.id}">${friend.username}</label>
                `;
                usersList.appendChild(item);
            });
        }
        
        this.openModal('new-chat-modal');
    }
    
    startNewChat() {
        const selectedUser = document.querySelector('input[name="chat-user"]:checked');
        const errorElement = document.getElementById('new-chat-error');
        
        if (!selectedUser) {
            errorElement.textContent = 'Выберите пользователя';
            return;
        }
        
        this.closeModal('new-chat-modal');
        this.openChat('private', selectedUser.value);
    }
    
    loadFriends() {
        const friends = this.db.getFriends(this.currentUser.id);
        const container = document.getElementById('friends-container');
        
        if (friends.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет друзей</p></div>';
            return;
        }
        
        container.innerHTML = '';
        friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'contact-item';
            friendElement.dataset.userId = friend.id;
            friendElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${friend.username}</h4>
                </div>
            `;
            
            friendElement.addEventListener('click', () => {
                this.openChat('private', friend.id);
            });
            
            container.appendChild(friendElement);
        });
    }
    
    loadGroups() {
        const groups = this.db.getUserGroups(this.currentUser.id);
        const container = document.getElementById('groups-container');
        
        if (groups.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет групп</p></div>';
            return;
        }
        
        container.innerHTML = '';
        groups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'contact-item';
            groupElement.dataset.groupId = group.id;
            groupElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-users"></i>
                </div>
                <div class="contact-info">
                    <h4>${group.name}</h4>
                    <p>${group.members.length} участников</p>
                </div>
            `;
            
            groupElement.addEventListener('click', () => {
                this.openChat('group', group.id);
            });
            
            container.appendChild(groupElement);
        });
    }
    
    loadChats() {
        const friends = this.db.getFriends(this.currentUser.id);
        const groups = this.db.getUserGroups(this.currentUser.id);
        const container = document.getElementById('chats-container');
        
        if (friends.length === 0 && groups.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет чатов</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        friends.forEach(friend => {
            const messages = this.db.getPrivateMessages(this.currentUser.id, friend.id);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            const chatElement = document.createElement('div');
            chatElement.className = 'contact-item';
            chatElement.dataset.userId = friend.id;
            chatElement.dataset.chatType = 'private';
            chatElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${friend.username}</h4>
                    <p>${lastMessage ? (lastMessage.senderId === this.currentUser.id ? 'Вы: ' : '') + this.truncateText(lastMessage.text, 20) : 'Нет сообщений'}</p>
                </div>
                <div class="contact-meta">
                    ${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.openChat('private', friend.id);
            });
            
            container.appendChild(chatElement);
        });
        
        groups.forEach(group => {
            const messages = this.db.getGroupMessages(group.id);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const lastSender = lastMessage ? this.db.getUserById(lastMessage.senderId) : null;
            
            const chatElement = document.createElement('div');
            chatElement.className = 'contact-item';
            chatElement.dataset.groupId = group.id;
            chatElement.dataset.chatType = 'group';
            chatElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-users"></i>
                </div>
                <div class="contact-info">
                    <h4>${group.name}</h4>
                    <p>${lastMessage ? (lastSender ? lastSender.username + ': ' : '') + this.truncateText(lastMessage.text, 20) : 'Нет сообщений'}</p>
                </div>
                <div class="contact-meta">
                    ${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.openChat('group', group.id);
            });
            
            container.appendChild(chatElement);
        });
    }
    
    openChat(type, id) {
        this.currentChat = { type, id };
        
        document.getElementById('chat-placeholder').classList.add('hidden');
        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('messages-container').classList.remove('hidden');
        document.getElementById('message-input-container').classList.remove('hidden');
        
        if (type === 'private') {
            const user = this.db.getUserById(id);
            if (user) {
                document.getElementById('chat-title').textContent = user.username;
                document.getElementById('chat-subtitle').textContent = 'В сети';
                document.getElementById('chat-avatar-icon').className = 'fas fa-user';
            }
        } else if (type === 'group') {
            const group = this.db.getGroupById(id);
            if (group) {
                document.getElementById('chat-title').textContent = group.name;
                document.getElementById('chat-subtitle').textContent = `${group.members.length} участников`;
                document.getElementById('chat-avatar-icon').className = 'fas fa-users';
            }
        }
        
        this.loadMessages();
        this.highlightActiveChat();
        
        setTimeout(() => {
            document.getElementById('message-input').focus();
        }, 100);
    }
    
    loadMessages() {
        if (!this.currentChat) return;
        
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        
        let messages = [];
        
        if (this.currentChat.type === 'private') {
            messages = this.db.getPrivateMessages(this.currentUser.id, this.currentChat.id);
        } else if (this.currentChat.type === 'group') {
            messages = this.db.getGroupMessages(this.currentChat.id);
        }
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="no-messages"><p>Нет сообщений</p></div>';
            return;
        }
        
        messages.forEach(message => {
            const isSent = message.senderId === this.currentUser.id;
            const sender = this.db.getUserById(message.senderId);
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            
            let senderName = '';
            if (!isSent && this.currentChat.type === 'group' && sender) {
                senderName = `<div class="sender-name">${sender.username}</div>`;
            }
            
            messageElement.innerHTML = `
                ${senderName}
                <div class="message-bubble">${this.escapeHtml(message.text)}</div>
                <div class="message-info">${this.formatTime(message.timestamp)}</div>
            `;
            
            container.appendChild(messageElement);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    sendMessage() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат');
            return;
        }
        
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (this.currentChat.type === 'private') {
            this.db.addMessage(this.currentUser.id, this.currentChat.id, null, text);
        } else if (this.currentChat.type === 'group') {
            this.db.addMessage(this.currentUser.id, null, this.currentChat.id, text);
        }
        
        input.value = '';
        this.loadMessages();
        this.loadChats();
    }
    
    highlightActiveChat() {
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentChat.type === 'private') {
            const chatElement = document.querySelector(`.contact-item[data-user-id="${this.currentChat.id}"]`);
            if (chatElement) chatElement.classList.add('active');
        } else if (this.currentChat.type === 'group') {
            const chatElement = document.querySelector(`.contact-item[data-group-id="${this.currentChat.id}"]`);
            if (chatElement) chatElement.classList.add('active');
        }
    }
    
    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours < 24) return `${diffHours} ч назад`;
        
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 1) return 'вчера';
        if (diffDays < 7) return `${diffDays} дн назад`;
        
        return date.toLocaleDateString();
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MessengerApp();
});

// ==================== ДОБАВЛЯЕМ СТИЛИ ДЛЯ НОВЫХ ЭЛЕМЕНТОВ ====================
const extraStyles = `
<style>
    /* Меню пользователя */
    .user-menu {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        min-width: 200px;
        overflow: hidden;
    }
    
    .menu-item {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: background 0.2s;
    }
    
    .menu-item:hover {
        background: #f5f5f5;
    }
    
    .menu-item i {
        width: 20px;
        color: #666;
    }
    
    /* Статус синхронизации */
    .sync-status {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin: 10px 20px;
        font-size: 12px;
    }
    
    .sync-status span {
        color: #666;
    }
    
    .btn-icon.small {
        width: 28px;
        height: 28px;
        font-size: 14px;
    }
    
    /* Текстовые поля в модалках */
    textarea {
        width: 100%;
        height: 150px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
        margin: 10px 0;
    }
    
    /* Адаптивность для телефона */
    @media (max-width: 768px) {
        .sidebar {
            width: 100%;
        }
        
        .user-menu {
            position: fixed !important;
            top: 70px;
            right: 10px;
            left: 10px;
            z-index: 10000;
        }
        
        .sync-status {
            margin: 10px;
        }
        
        .modal-content {
            width: 95%;
            max-height: 80vh;
        }
    }
    
    /* Индикатор состояния */
    .error {
        color: #ff4444;
        margin-top: 10px;
        font-size: 14px;
    }
</style>
`;

// Добавляем стили в документ
document.head.insertAdjacentHTML('beforeend', extraStyles);


