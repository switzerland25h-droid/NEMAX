// ==================== ПРОСТАЯ БАЗА ДАННЫХ С ЭКСПОРТОМ ====================
class SimpleDB {
    constructor() {
        this.initDB();
    }
    
    initDB() {
        // Создаем демо-данные при первом запуске
        if (!localStorage.getItem('messenger_data')) {
            this.createDemoData();
        }
    }
    
    createDemoData() {
        const demoData = {
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
            friendships: [
                { id: 'f1', userId: 'user1', friendId: 'user2', accepted: true },
                { id: 'f2', userId: 'user1', friendId: 'user3', accepted: true },
                { id: 'f3', userId: 'user2', friendId: 'user3', accepted: true }
            ],
            groups: [
                {
                    id: 'group1',
                    name: 'Демо группа',
                    creatorId: 'user1',
                    members: ['user1', 'user2', 'user3'],
                    createdAt: new Date().toISOString()
                }
            ],
            messages: [
                {
                    id: 'msg1',
                    senderId: 'user1',
                    receiverId: 'user2',
                    groupId: null,
                    text: 'Привет! Как дела?',
                    timestamp: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 'msg2',
                    senderId: 'user2',
                    receiverId: 'user1',
                    groupId: null,
                    text: 'Привет! Все отлично, спасибо!',
                    timestamp: new Date(Date.now() - 3000000).toISOString()
                }
            ]
        };
        
        this.saveAllData(demoData);
    }
    
    // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ДАННЫМИ ====================
    
    getAllData() {
        const data = localStorage.getItem('messenger_data');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('Ошибка парсинга данных:', e);
                return this.getEmptyData();
            }
        }
        return this.getEmptyData();
    }
    
    getEmptyData() {
        return {
            users: [],
            friendships: [],
            groups: [],
            messages: []
        };
    }
    
    saveAllData(data) {
        localStorage.setItem('messenger_data', JSON.stringify(data));
    }
    
    // Пользователи
    getUsers() {
        return this.getAllData().users;
    }
    
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }
    
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }
    
    addUser(username, password) {
        const data = this.getAllData();
        const users = data.users;
        
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
        data.users = users;
        this.saveAllData(data);
        
        return { success: true, user: newUser };
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
    
    // Друзья
    getFriendships() {
        return this.getAllData().friendships;
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
    
    addFriend(userId, friendUsername) {
        const friendUser = this.getUserByUsername(friendUsername);
        
        if (!friendUser) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (friendUser.id === userId) {
            return { success: false, message: 'Нельзя добавить себя' };
        }
        
        const data = this.getAllData();
        const friendships = data.friendships;
        
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
            // Принимаем запрос
            existing.accepted = true;
            data.friendships = friendships;
            this.saveAllData(data);
            return { success: true, message: 'Запрос принят' };
        }
        
        friendships.push({
            id: 'f_' + Date.now(),
            userId,
            friendId: friendUser.id,
            accepted: false
        });
        
        data.friendships = friendships;
        this.saveAllData(data);
        return { success: true, message: 'Запрос отправлен' };
    }
    
    // Группы
    getGroups() {
        return this.getAllData().groups;
    }
    
    getGroupById(id) {
        const groups = this.getGroups();
        return groups.find(group => group.id === id);
    }
    
    getUserGroups(userId) {
        const groups = this.getGroups();
        return groups.filter(group => group.members.includes(userId));
    }
    
    createGroup(name, creatorId, memberIds) {
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }
        
        const data = this.getAllData();
        const groups = data.groups;
        
        const newGroup = {
            id: 'group_' + Date.now(),
            name,
            creatorId,
            members: memberIds,
            createdAt: new Date().toISOString()
        };
        
        groups.push(newGroup);
        data.groups = groups;
        this.saveAllData(data);
        
        return { success: true, group: newGroup };
    }
    
    // Сообщения
    getMessages() {
        return this.getAllData().messages;
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
    
    addMessage(senderId, receiverId, groupId, text) {
        const data = this.getAllData();
        const messages = data.messages;
        
        const newMessage = {
            id: 'msg_' + Date.now(),
            senderId,
            receiverId: groupId ? null : receiverId,
            groupId: groupId || null,
            text,
            timestamp: new Date().toISOString()
        };
        
        messages.push(newMessage);
        data.messages = messages;
        this.saveAllData(data);
        
        return newMessage;
    }
    
    // ==================== ЭКСПОРТ/ИМПОРТ ДАННЫХ ====================
    
    exportData() {
        const data = this.getAllData();
        return JSON.stringify(data, null, 2);
    }
    
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Проверяем структуру
            if (!data.users || !data.friendships || !data.groups || !data.messages) {
                return { success: false, message: 'Неправильный формат данных' };
            }
            
            // Сохраняем данные
            this.saveAllData(data);
            
            return { success: true, message: 'Данные успешно импортированы!' };
        } catch (error) {
            return { success: false, message: 'Ошибка при импорте: ' + error.message };
        }
    }
    
    // Экспорт данных в файл (скачивание)
    exportToFile() {
        const data = this.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'messenger_backup_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        return 'Данные экспортированы в файл!';
    }
    
    // Импорт из файла
    importFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = this.importData(e.target.result);
                resolve(result);
            };
            reader.onerror = () => {
                resolve({ success: false, message: 'Ошибка чтения файла' });
            };
            reader.readAsText(file);
        });
    }
}

// ==================== ОСНОВНОЕ ПРИЛОЖЕНИЕ ====================
class MessengerApp {
    constructor() {
        this.db = new SimpleDB();
        this.currentUser = null;
        this.currentChat = null;
        
        this.init();
    }
    
    init() {
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
        
        this.setupEventListeners();
        this.setupModals();
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
        
        // Кнопка экспорта данных
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-icon';
        exportBtn.title = 'Экспорт данных';
        exportBtn.innerHTML = '<i class="fas fa-download"></i>';
        exportBtn.addEventListener('click', () => this.showExportModal());
        document.querySelector('.sidebar-header').appendChild(exportBtn);
        
        // Кнопка импорта данных
        const importBtn = document.createElement('button');
        importBtn.className = 'btn-icon';
        importBtn.title = 'Импорт данных';
        importBtn.innerHTML = '<i class="fas fa-upload"></i>';
        importBtn.addEventListener('click', () => this.showImportModal());
        document.querySelector('.sidebar-header').appendChild(importBtn);
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
                    <p>Скопируйте этот код и сохраните его. Используйте для переноса данных на другое устройство.</p>
                    <textarea id="export-data" readonly style="width: 100%; height: 200px; margin: 10px 0; padding: 10px; font-family: monospace;">${data}</textarea>
                    <button id="copy-btn" class="btn btn-primary">Копировать в буфер</button>
                    <button id="download-btn" class="btn btn-secondary" style="margin-left: 10px;">Скачать файл</button>
                </div>
                <div class="modal-footer">
                    <button class="btn close-modal">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Копирование в буфер
        modal.querySelector('#copy-btn').addEventListener('click', () => {
            const textarea = modal.querySelector('#export-data');
            textarea.select();
            document.execCommand('copy');
            this.showNotification('Данные скопированы в буфер!');
        });
        
        // Скачивание файла
        modal.querySelector('#download-btn').addEventListener('click', () => {
            const result = this.db.exportToFile();
            this.showNotification(result);
        });
        
        // Закрытие модального окна
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
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
                    <p>Вставьте код с экспортированными данными или выберите файл:</p>
                    <textarea id="import-data" placeholder="Вставьте JSON код здесь..." style="width: 100%; height: 150px; margin: 10px 0; padding: 10px; font-family: monospace;"></textarea>
                    <p>Или выберите файл:</p>
                    <input type="file" id="import-file" accept=".json" style="margin: 10px 0;">
                    <div class="modal-error" id="import-error"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn close-modal">Отмена</button>
                    <button class="btn btn-primary" id="confirm-import">Импортировать</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Импорт из текста
        modal.querySelector('#confirm-import').addEventListener('click', async () => {
            const textarea = modal.querySelector('#import-data');
            const fileInput = modal.querySelector('#import-file');
            const errorElement = modal.querySelector('#import-error');
            
            let jsonString = textarea.value.trim();
            
            // Если выбран файл, читаем его
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                    errorElement.textContent = 'Выберите JSON файл';
                    return;
                }
                
                try {
                    const result = await this.db.importFromFile(file);
                    if (result.success) {
                        this.showNotification(result.message);
                        document.body.removeChild(modal);
                        
                        // Обновляем интерфейс
                        this.loadFriends();
                        this.loadGroups();
                        this.loadChats();
                        
                        // Если открыт чат, обновляем сообщения
                        if (this.currentChat) {
                            this.loadMessages();
                        }
                    } else {
                        errorElement.textContent = result.message;
                    }
                } catch (error) {
                    errorElement.textContent = 'Ошибка чтения файла: ' + error.message;
                }
                return;
            }
            
            // Импорт из текста
            if (!jsonString) {
                errorElement.textContent = 'Вставьте JSON код или выберите файл';
                return;
            }
            
            const result = this.db.importData(jsonString);
            if (result.success) {
                this.showNotification(result.message);
                document.body.removeChild(modal);
                
                // Обновляем интерфейс
                this.loadFriends();
                this.loadGroups();
                this.loadChats();
                
                // Если открыт чат, обновляем сообщения
                if (this.currentChat) {
                    this.loadMessages();
                }
            } else {
                errorElement.textContent = result.message;
            }
        });
        
        // Закрытие модального окна
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
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
    
    register() {
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
        
        const result = this.db.addUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('messenger_currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            this.showNotification('Регистрация успешна!');
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
    
    addFriend() {
        const friendUsername = document.getElementById('friend-username').value.trim();
        const errorElement = document.getElementById('add-friend-error');
        
        if (!friendUsername) {
            errorElement.textContent = 'Введите никнейм';
            return;
        }
        
        const result = this.db.addFriend(this.currentUser.id, friendUsername);
        
        if (result.success) {
            this.closeModal('add-friend-modal');
            this.loadFriends();
            this.showNotification(result.message);
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
    
    createGroup() {
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
        
        const result = this.db.createGroup(groupName, this.currentUser.id, memberIds);
        
        if (result.success) {
            this.closeModal('create-group-modal');
            this.loadGroups();
            this.showNotification('Группа создана!');
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

// ==================== ФУНКЦИИ ДЛЯ КОНСОЛИ ====================

// Экспорт данных
window.exportData = function() {
    const db = new SimpleDB();
    const data = db.exportData();
    console.log('=== КОД ДЛЯ ЭКСПОРТА ===');
    console.log(data);
    console.log('=======================');
    
    // Копируем в буфер
    navigator.clipboard.writeText(data).then(() => {
        alert('Данные скопированы в буфер! Вставьте их на другом устройстве.');
    }).catch(err => {
        alert('Скопируйте текст из консоли (F12)');
    });
    
    return data;
};

// Импорт данных
window.importData = function(jsonString) {
    const db = new SimpleDB();
    const result = db.importData(jsonString);
    alert(result.message);
    if (result.success) {
        location.reload();
    }
};

// Показать информацию о данных
window.showDataInfo = function() {
    const db = new SimpleDB();
    const data = db.getAllData();
    
    console.log('=== ИНФОРМАЦИЯ О ДАННЫХ ===');
    console.log('Пользователей:', data.users.length);
    console.log('Дружеских связей:', data.friendships.length);
    console.log('Групп:', data.groups.length);
    console.log('Сообщений:', data.messages.length);
    console.log('===========================');
    
    return data;
};

// Сброс данных
window.resetData = function() {
    if (confirm('Сбросить все данные? Восстановить будет нельзя.')) {
        localStorage.clear();
        alert('Данные сброшены. Страница перезагрузится.');
        location.reload();
    }
};
