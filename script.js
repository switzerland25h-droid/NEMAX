// База данных мессенджера
class MessengerDB {
    constructor() {
        this.initDB();
    }
    
    initDB() {
        // Инициализация данных, если они еще не существуют
        if (!localStorage.getItem('messenger_users')) {
            localStorage.setItem('messenger_users', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('messenger_friendships')) {
            localStorage.setItem('messenger_friendships', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('messenger_groups')) {
            localStorage.setItem('messenger_groups', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('messenger_messages')) {
            localStorage.setItem('messenger_messages', JSON.stringify([]));
        }
        
        // Создание демо-данных, если пользователей нет
        this.createDemoData();
    }
    
    createDemoData() {
        const users = this.getUsers();
        if (users.length === 0) {
            const demoUsers = [
                { id: this.generateId(), username: 'user1', password: 'pass123', createdAt: new Date().toISOString() },
                { id: this.generateId(), username: 'user2', password: 'pass123', createdAt: new Date().toISOString() },
                { id: this.generateId(), username: 'user3', password: 'pass123', createdAt: new Date().toISOString() }
            ];
            localStorage.setItem('messenger_users', JSON.stringify(demoUsers));
            
            // Добавляем друзей между демо-пользователями
            const friendships = [
                { id: this.generateId(), userId: demoUsers[0].id, friendId: demoUsers[1].id, accepted: true },
                { id: this.generateId(), userId: demoUsers[0].id, friendId: demoUsers[2].id, accepted: true },
                { id: this.generateId(), userId: demoUsers[1].id, friendId: demoUsers[2].id, accepted: true }
            ];
            localStorage.setItem('messenger_friendships', JSON.stringify(friendships));
            
            // Создаем демо-группу
            const demoGroup = {
                id: this.generateId(),
                name: 'Демо группа',
                creatorId: demoUsers[0].id,
                members: [demoUsers[0].id, demoUsers[1].id, demoUsers[2].id],
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('messenger_groups', JSON.stringify([demoGroup]));
            
            // Создаем демо-сообщения
            const demoMessages = [
                {
                    id: this.generateId(),
                    senderId: demoUsers[0].id,
                    receiverId: demoUsers[1].id,
                    groupId: null,
                    text: 'Привет! Как дела?',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    read: true
                },
                {
                    id: this.generateId(),
                    senderId: demoUsers[1].id,
                    receiverId: demoUsers[0].id,
                    groupId: null,
                    text: 'Привет! Все отлично, спасибо!',
                    timestamp: new Date(Date.now() - 3000000).toISOString(),
                    read: true
                },
                {
                    id: this.generateId(),
                    senderId: demoUsers[0].id,
                    receiverId: null,
                    groupId: demoGroup.id,
                    text: 'Всем привет в нашей демо-группе!',
                    timestamp: new Date(Date.now() - 2400000).toISOString(),
                    read: true
                },
                {
                    id: this.generateId(),
                    senderId: demoUsers[2].id,
                    receiverId: null,
                    groupId: demoGroup.id,
                    text: 'Привет всем!',
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    read: true
                }
            ];
            localStorage.setItem('messenger_messages', JSON.stringify(demoMessages));
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Методы для работы с пользователями
    getUsers() {
        return JSON.parse(localStorage.getItem('messenger_users') || '[]');
    }
    
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }
    
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }
    
    addUser(username, password) {
        const users = this.getUsers();
        
        // Проверяем, существует ли пользователь с таким именем
        if (users.some(user => user.username === username)) {
            return { success: false, message: 'Пользователь с таким именем уже существует' };
        }
        
        const newUser = {
            id: this.generateId(),
            username,
            password,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('messenger_users', JSON.stringify(users));
        
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
    
    // Методы для работы с друзьями
    getFriendships() {
        return JSON.parse(localStorage.getItem('messenger_friendships') || '[]');
    }
    
    getFriends(userId) {
        const friendships = this.getFriendships();
        const users = this.getUsers();
        
        // Получаем ID друзей пользователя (принятые запросы)
        const friendIds = friendships
            .filter(f => (f.userId === userId || f.friendId === userId) && f.accepted)
            .map(f => f.userId === userId ? f.friendId : f.friendId === userId ? f.userId : null)
            .filter(id => id !== null);
        
        // Получаем объекты пользователей-друзей
        return friendIds.map(id => users.find(user => user.id === id)).filter(user => user);
    }
    
    getFriendRequests(userId) {
        const friendships = this.getFriendships();
        const users = this.getUsers();
        
        // Получаем входящие запросы в друзья
        const incomingRequests = friendships
            .filter(f => f.friendId === userId && !f.accepted)
            .map(f => {
                const user = users.find(u => u.id === f.userId);
                return { ...f, friendUsername: user ? user.username : 'Неизвестный пользователь' };
            });
        
        return incomingRequests;
    }
    
    addFriend(userId, friendUsername) {
        const friendUser = this.getUserByUsername(friendUsername);
        
        if (!friendUser) {
            return { success: false, message: 'Пользователь с таким именем не найден' };
        }
        
        if (friendUser.id === userId) {
            return { success: false, message: 'Вы не можете добавить себя в друзья' };
        }
        
        const friendships = this.getFriendships();
        
        // Проверяем, существует ли уже такая дружба или запрос
        const existingFriendship = friendships.find(f => 
            (f.userId === userId && f.friendId === friendUser.id) || 
            (f.userId === friendUser.id && f.friendId === userId)
        );
        
        if (existingFriendship) {
            if (existingFriendship.accepted) {
                return { success: false, message: 'Этот пользователь уже у вас в друзьях' };
            } else {
                if (existingFriendship.userId === userId) {
                    return { success: false, message: 'Вы уже отправили запрос этому пользователю' };
                } else {
                    // Принимаем запрос
                    existingFriendship.accepted = true;
                    localStorage.setItem('messenger_friendships', JSON.stringify(friendships));
                    return { success: true, message: 'Запрос в друзья принят' };
                }
            }
        }
        
        // Создаем новый запрос в друзья
        const newFriendship = {
            id: this.generateId(),
            userId,
            friendId: friendUser.id,
            accepted: false
        };
        
        friendships.push(newFriendship);
        localStorage.setItem('messenger_friendships', JSON.stringify(friendships));
        
        return { success: true, message: 'Запрос в друзья отправлен' };
    }
    
    // Методы для работы с группами
    getGroups() {
        return JSON.parse(localStorage.getItem('messenger_groups') || '[]');
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
        const groups = this.getGroups();
        
        // Убедимся, что создатель включен в участники
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }
        
        const newGroup = {
            id: this.generateId(),
            name,
            creatorId,
            members: [...new Set(memberIds)], // Убираем дубликаты
            createdAt: new Date().toISOString()
        };
        
        groups.push(newGroup);
        localStorage.setItem('messenger_groups', JSON.stringify(groups));
        
        return { success: true, group: newGroup };
    }
    
    // Методы для работы с сообщениями
    getMessages() {
        return JSON.parse(localStorage.getItem('messenger_messages') || '[]');
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
        const messages = this.getMessages();
        
        const newMessage = {
            id: this.generateId(),
            senderId,
            receiverId: groupId ? null : receiverId,
            groupId: groupId || null,
            text,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages.push(newMessage);
        localStorage.setItem('messenger_messages', JSON.stringify(messages));
        
        return newMessage;
    }
    
    // Экспорт и импорт данных
    exportData() {
        const data = {
            users: this.getUsers(),
            friendships: this.getFriendships(),
            groups: this.getGroups(),
            messages: this.getMessages(),
            exportedAt: new Date().toISOString()
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Проверяем структуру данных
            if (!data.users || !data.friendships || !data.groups || !data.messages) {
                return { success: false, message: 'Неправильный формат данных' };
            }
            
            // Импортируем данные
            localStorage.setItem('messenger_users', JSON.stringify(data.users));
            localStorage.setItem('messenger_friendships', JSON.stringify(data.friendships));
            localStorage.setItem('messenger_groups', JSON.stringify(data.groups));
            localStorage.setItem('messenger_messages', JSON.stringify(data.messages));
            
            return { success: true, message: 'Данные успешно импортированы' };
        } catch (error) {
            return { success: false, message: 'Ошибка при импорте данных: ' + error.message };
        }
    }
}

// Основной класс приложения
class MessengerApp {
    constructor() {
        this.db = new MessengerDB();
        this.currentUser = null;
        this.currentChat = null; // { type: 'private'|'group', id: userId/groupId }
        
        this.init();
    }
    
    init() {
        // Проверяем, авторизован ли пользователь
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
        
        // Обновляем информацию о текущем пользователе
        document.getElementById('current-username').textContent = this.currentUser.username;
        
        // Загружаем данные
        this.loadFriends();
        this.loadGroups();
        this.loadChats();
    }
    
    setupEventListeners() {
        // Авторизация
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Переключение между вкладками авторизации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });
        
        // Переключение между вкладками в боковой панели
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
        
        // Отправка сообщения
        document.getElementById('send-message-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Закрытие панели информации
        document.getElementById('close-info-btn').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });
    }
    
    setupModals() {
        // Модальное окно добавления друга
        document.getElementById('confirm-add-friend').addEventListener('click', () => this.addFriend());
        document.getElementById('cancel-add-friend').addEventListener('click', () => this.closeModal('add-friend-modal'));
        
        // Модальное окно создания группы
        document.getElementById('confirm-create-group').addEventListener('click', () => this.createGroup());
        document.getElementById('cancel-create-group').addEventListener('click', () => this.closeModal('create-group-modal'));
        
        // Модальное окно нового чата
        document.getElementById('confirm-new-chat').addEventListener('click', () => this.startNewChat());
        document.getElementById('cancel-new-chat').addEventListener('click', () => this.closeModal('new-chat-modal'));
        
        // Экспорт/импорт данных
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        
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
        // Переключаем активную кнопку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Переключаем активную форму
        document.getElementById('login-form').classList.toggle('active', tab === 'login');
        document.getElementById('register-form').classList.toggle('active', tab === 'register');
        
        // Очищаем ошибки
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }
    
    switchSidebarTab(tab) {
        // Переключаем активную кнопку
        document.querySelectorAll('.sidebar-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Переключаем активный контент
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
            this.showNotification('Успешный вход!');
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
            errorElement.textContent = 'Пароль должен быть не менее 6 символов';
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
        this.showNotification('Вы вышли из системы');
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
            errorElement.textContent = 'Введите имя пользователя';
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
        
        // Загружаем список друзей для выбора
        const friends = this.db.getFriends(this.currentUser.id);
        const membersList = document.getElementById('group-members-list');
        membersList.innerHTML = '';
        
        friends.forEach(friend => {
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox-item';
            checkbox.innerHTML = `
                <input type="checkbox" id="member-${friend.id}" value="${friend.id}">
                <label for="member-${friend.id}">${friend.username}</label>
            `;
            membersList.appendChild(checkbox);
        });
        
        this.openModal('create-group-modal');
    }
    
    createGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        const errorElement = document.getElementById('create-group-error');
        
        if (!groupName) {
            errorElement.textContent = 'Введите название группы';
            return;
        }
        
        // Получаем выбранных участников
        const checkboxes = document.querySelectorAll('#group-members-list input[type="checkbox"]:checked');
        const memberIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (memberIds.length === 0) {
            errorElement.textContent = 'Выберите хотя бы одного участника';
            return;
        }
        
        const result = this.db.createGroup(groupName, this.currentUser.id, memberIds);
        
        if (result.success) {
            this.closeModal('create-group-modal');
            this.loadGroups();
            this.showNotification(`Группа "${groupName}" создана!`);
            
            // Открываем чат с созданной группой
            this.openChat('group', result.group.id);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    showNewChatModal() {
        document.getElementById('new-chat-error').textContent = '';
        
        // Загружаем список друзей для выбора
        const friends = this.db.getFriends(this.currentUser.id);
        const usersList = document.getElementById('new-chat-users-list');
        usersList.innerHTML = '';
        
        if (friends.length === 0) {
            usersList.innerHTML = '<p>У вас пока нет друзей для начала чата</p>';
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
            errorElement.textContent = 'Выберите пользователя для чата';
            return;
        }
        
        this.closeModal('new-chat-modal');
        this.openChat('private', selectedUser.value);
    }
    
    loadFriends() {
        const friends = this.db.getFriends(this.currentUser.id);
        const container = document.getElementById('friends-container');
        
        if (friends.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>У вас пока нет друзей</p></div>';
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
                    <p>В сети</p>
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
            container.innerHTML = '<div class="contact-item"><p>У вас пока нет групп</p></div>';
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
            container.innerHTML = '<div class="contact-item"><p>У вас пока нет чатов</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        // Добавляем чаты с друзьями
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
                    <p>${lastMessage ? (lastMessage.senderId === this.currentUser.id ? 'Вы: ' : '') + lastMessage.text.substring(0, 20) + (lastMessage.text.length > 20 ? '...' : '') : 'Нет сообщений'}</p>
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
        
        // Добавляем групповые чаты
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
                    <p>${lastMessage ? (lastSender ? lastSender.username + ': ' : '') + lastMessage.text.substring(0, 20) + (lastMessage.text.length > 20 ? '...' : '') : 'Нет сообщений'}</p>
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
        
        // Скрываем placeholder
        document.getElementById('chat-placeholder').classList.add('hidden');
        
        // Показываем элементы чата
        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('messages-container').classList.remove('hidden');
        document.getElementById('message-input-container').classList.remove('hidden');
        
        // Загружаем информацию о чате
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
        
        // Загружаем сообщения
        this.loadMessages();
        
        // Показываем активный чат в списке
        this.highlightActiveChat();
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
            container.innerHTML = '<div class="no-messages"><p>Нет сообщений. Начните общение!</p></div>';
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
                <div class="message-bubble">${message.text}</div>
                <div class="message-info">${this.formatTime(message.timestamp)}</div>
            `;
            
            container.appendChild(messageElement);
        });
        
        // Прокручиваем вниз
        container.scrollTop = container.scrollHeight;
    }
    
    sendMessage() {
        if (!this.currentChat) {
            this.showNotification('Сначала выберите чат');
            return;
        }
        
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        // Добавляем сообщение в базу данных
        if (this.currentChat.type === 'private') {
            this.db.addMessage(this.currentUser.id, this.currentChat.id, null, text);
        } else if (this.currentChat.type === 'group') {
            this.db.addMessage(this.currentUser.id, null, this.currentChat.id, text);
        }
        
        // Очищаем поле ввода
        input.value = '';
        
        // Обновляем сообщения
        this.loadMessages();
        
        // Обновляем список чатов
        this.loadChats();
    }
    
    highlightActiveChat() {
        // Убираем выделение со всех чатов
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Находим и выделяем активный чат
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
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
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
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'только что';
        } else if (diffMins < 60) {
            return `${diffMins} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else if (diffDays === 1) {
            return 'вчера';
        } else if (diffDays < 7) {
            return `${diffDays} дн назад`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    exportData() {
        const data = this.db.exportData();
        document.getElementById('export-data').value = data;
        this.showNotification('Данные экспортированы');
    }
    
    importData() {
        const data = document.getElementById('import-data').value.trim();
        const errorElement = document.getElementById('import-error');
        
        if (!data) {
            errorElement.textContent = 'Введите данные для импорта';
            return;
        }
        
        const result = this.db.importData(data);
        
        if (result.success) {
            errorElement.textContent = '';
            this.closeModal('export-import-modal');
            this.showNotification(result.message);
            
            // Обновляем данные на экране
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
    }
}

// Инициализация приложения после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    new MessengerApp();
});