class TrelloClone {
    constructor() {
        this.boards = JSON.parse(localStorage.getItem('trello-boards')) || [];
        this.currentDragging = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderBoards();
        this.checkReminders();
        setInterval(() => this.checkReminders(), 60000); // Verifica lembretes a cada minuto
    }

    bindEvents() {
        document.getElementById('addBoardBtn').addEventListener('click', () => this.showListModal());
        document.getElementById('configBtn').addEventListener('click', () => this.openConfig());
        
        // Modais
        document.getElementById('closeListModal').addEventListener('click', () => this.hideListModal());
        document.getElementById('closeCardModal').addEventListener('click', () => this.hideCardModal());
        document.getElementById('closeCardDetail').addEventListener('click', () => this.hideCardDetailModal());
        
        document.getElementById('createListBtn').addEventListener('click', () => this.createBoard());
        document.getElementById('createCardBtn').addEventListener('click', () => this.createCard());
        
        // Enter para criar
        document.getElementById('listTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createBoard();
        });
        document.getElementById('cardTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) this.createCard();
        });
    }

    renderBoards() {
        const container = document.getElementById('boardContainer');
        container.innerHTML = '';

        this.boards.forEach((board, boardIndex) => {
            const boardElement = this.createBoardElement(board, boardIndex);
            container.appendChild(boardElement);
        });
    }

    createBoardElement(board, boardIndex) {
        const list = document.createElement('div');
        list.className = 'list';
        list.dataset.boardIndex = boardIndex;
        list.draggable = true;

        list.innerHTML = `
            <div class="list-header">
                <input type="text" class="list-title" value="${board.title}" data-board-index="${boardIndex}">
                <div class="list-actions">
                    <button class="delete-board-btn" data-board-index="${boardIndex}" title="Excluir lista">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-list" data-board-index="${boardIndex}">
                ${board.cards.map((card, cardIndex) => this.createCardElement(card, boardIndex, cardIndex)).join('')}
            </div>
            <div class="list-compose">
                <button class="add-card-btn" data-board-index="${boardIndex}">
                    <i class="fas fa-plus"></i> Adicionar um card
                </button>
            </div>
        `;

        // Event listeners para a lista
        list.querySelector('.list-title').addEventListener('blur', (e) => this.updateBoardTitle(e.target));
        list.querySelector('.list-title').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') e.target.blur();
        });
        list.querySelector('.delete-board-btn').addEventListener('click', (e) => this.deleteBoard(e.target.dataset.boardIndex));
        list.querySelector('.add-card-btn').addEventListener('click', (e) => this.showCardModal(parseInt(e.target.dataset.boardIndex)));
        list.querySelector('.card-list').addEventListener('dragover', (e) => this.handleDragOver(e));
        list.querySelector('.card-list').addEventListener('drop', (e) => this.handleDrop(e));

        // Drag para lista inteira
        list.addEventListener('dragstart', (e) => this.handleBoardDragStart(e, boardIndex));
        list.addEventListener('dragover', (e) => e.preventDefault());
        list.addEventListener('drop', (e) => this.handleBoardDrop(e));

        return list;
    }

    createCardElement(card, boardIndex, cardIndex) {
        const labelClass = card.label ? `card-label ${card.label}` : '';
        const dateHtml = card.date ? `<div class="card-date">${this.formatDate(card.date)}</div>` : '';
        
        return `
            <div class="card" draggable="true" data-board-index="${boardIndex}" data-card-index="${cardIndex}">
                ${labelClass ? `<span class="${labelClass}">${card.label}</span>` : ''}
                <div class="card-title">${card.title}</div>
                ${dateHtml}
            </div>
        `;
    }

    showListModal() {
        document.getElementById('listModal').classList.add('active');
        document.getElementById('listTitle').focus();
    }

    hideListModal() {
        document.getElementById('listModal').classList.remove('active');
        document.getElementById('listTitle').value = '';
    }

    createBoard() {
        const title = document.getElementById('listTitle').value.trim();
        if (!title) return;

        this.boards.push({
            title,
            cards: []
        });

        this.saveData();
        this.renderBoards();
        this.hideListModal();
    }

    updateBoardTitle(input) {
        const boardIndex = parseInt(input.dataset.boardIndex);
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== this.boards[boardIndex].title) {
            this.boards[boardIndex].title = newTitle;
            this.saveData();
        }
    }

    deleteBoard(boardIndex) {
        if (confirm('Tem certeza que deseja excluir esta lista?')) {
            this.boards.splice(boardIndex, 1);
            this.saveData();
            this.renderBoards();
        }
    }

    showCardModal(boardIndex) {
        this.currentBoardIndex = boardIndex;
        document.getElementById('cardModal').classList.add('active');
        document.getElementById('cardTitle').focus();
    }

    hideCardModal() {
        document.getElementById('cardModal').classList.remove('active');
        document.getElementById('cardTitle').value = '';
        document.getElementById('cardDesc').value = '';
        document.getElementById('cardDate').value = '';
        document.getElementById('cardLabel').value = '';
    }

    createCard() {
        const title = document.getElementById('cardTitle').value.trim();
        if (!title) return;

        const card = {
            title,
            description: document.getElementById('cardDesc').value,
            date: document.getElementById('cardDate').value || null,
            label: document.getElementById('cardLabel').value || null,
            createdAt: new Date().toISOString()
        };

        this.boards[this.currentBoardIndex].cards.push(card);
        this.saveData();
        this.renderBoards();
        this.hideCardModal();
    }

    handleDragStart(e) {
        this.currentDragging = {
            boardIndex: parseInt(e.target.dataset.boardIndex),
            cardIndex: parseInt(e.target.dataset.cardIndex),
            element: e.target
        };
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.currentDragging) return;

        const targetBoardIndex = parseInt(e.currentTarget.dataset.boardIndex);
        
        if (targetBoardIndex !== this.currentDragging.boardIndex) {
            // Move para outra lista
            const card = this.boards[this.currentDragging.boardIndex].cards.splice(this.currentDragging.cardIndex, 1)[0];
            this.boards[targetBoardIndex].cards.push(card);
        } else {
            // Reordena na mesma lista
            const draggedCard = this.boards[targetBoardIndex].cards.splice(this.currentDragging.cardIndex, 1)[0];
            const dropY = e.clientY;
            const cards = [...e.currentTarget.querySelectorAll('.card')];
            
            cards.forEach((card, index) => {
                const rect = card.getBoundingClientRect();
                const center = rect.top + rect.height / 2;
                if (dropY < center) {
                    this.boards[targetBoardIndex].cards.splice(index, 0, draggedCard);
                    return;
                }
            });
            
            // Se chegou até o final, adiciona no fim
            if (this.boards[targetBoardIndex].cards[this.boards[targetBoardIndex].cards.length - 1] !== draggedCard) {
                this.boards[targetBoardIndex].cards.push(draggedCard);
            }
        }

        this.currentDragging.element.classList.remove('dragging');
        this.currentDragging = null;
        this.saveData();
        this.renderBoards();
    }

    handleBoardDragStart(e, boardIndex) {
        this.currentDraggingBoard = boardIndex;
        e.target.style.opacity = '0.5';
    }

    handleBoardDrop(e) {
        e.preventDefault();
        if (this.currentDraggingBoard !== undefined) {
            const draggedBoard = this.boards.splice(this.currentDraggingBoard, 1)[0];
            const dropIndex = parseInt(e.currentTarget.dataset.boardIndex);
            this.boards.splice(dropIndex, 0, draggedBoard);
            
            this.currentDraggingBoard = undefined;
            this.saveData();
            this.renderBoards();
        }
    }

    showCardDetail(card, boardIndex, cardIndex) {
        document.getElementById('editCardTitle').value = card.title;
        document.getElementById('editCardDesc').value = card.description || '';
        
        const labelDisplay = document.getElementById('cardLabelDisplay');
        const dateDisplay = document.getElementById('cardDateDisplay');
        
        if (card.label) {
            labelDisplay.innerHTML = `<i class="fas fa-tag"></i> Label: <strong>${card.label}</strong>`;
            labelDisplay.className = 'label-display active';
        } else {
            labelDisplay.innerHTML = '';
            labelDisplay.className = 'label-display';
        }
        
        if (card.date) {
            dateDisplay.innerHTML = `<i class="fas fa-calendar"></i> Data: <strong>${this.formatDate(card.date)}</strong>`;
            dateDisplay.className = 'date-display active';
        } else {
            dateDisplay.innerHTML = '';
            dateDisplay.className = 'date-display';
        }
        
        this.currentCard = { boardIndex, cardIndex };
        document.getElementById('cardDetailModal').classList.add('active');
        
        // Bind eventos do modal de detalhes
        document.getElementById('editCardTitle').focus();
        this.bindCardDetailEvents();
    }

    bindCardDetailEvents() {
        const titleInput = document.getElementById('editCardTitle');
        const descInput = document.getElementById('editCardDesc');
        
        const saveCard = () => {
            if (this.currentCard) {
                this.boards[this.currentCard.boardIndex].cards[this.currentCard.cardIndex] = {
                    ...this.boards[this.currentCard.boardIndex].cards[this.currentCard.cardIndex],
                    title: titleInput.value.trim(),
                    description: descInput.value
                };
                this.saveData();
                this.renderBoards();
            }
        };
        
        titleInput.removeEventListener('blur', saveCard); // Remove listener anterior
        titleInput.addEventListener('blur', saveCard);
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveCard();
        });
        
        descInput.removeEventListener('blur', saveCard);
        descInput.addEventListener('blur', saveCard);
    }

    deleteCard() {
        if (confirm('Tem certeza que deseja excluir este card?')) {
            this.boards[this.currentCard.boardIndex].cards.splice(this.currentCard.cardIndex, 1);
            this.saveData();
            this.renderBoards();
            this.hideCardDetailModal();
        }
    }

    hideCardDetailModal() {
        document.getElementById('cardDetailModal').classList.remove('active');
        this.currentCard = null;
    }

    saveData() {
        localStorage.setItem('trello-boards', JSON.stringify(this.boards));
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    checkReminders() {
        const now = new Date();
        this.boards.forEach(board => {
            board.cards.forEach(card => {
                if (card.date) {
                    const cardDate = new Date(card.date);
                    cardDate.setHours(0, 0, 0, 0);
                    now.setHours(0, 0, 0, 0);
                    
                    if (cardDate.getTime() === now.getTime()) {
                        if (!card.notified) {
                            this.showNotification(`${card.title} vence hoje!`);
                            card.notified = true;
                            this.saveData();
                        }
                    }
                }
            });
        });
    }

    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Lembrete Trello', { body: message });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        
        // Fallback visual
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    openConfig() {
        window.open('config.html', '_blank');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    new TrelloClone();
});

// Drag & Drop global handlers
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('card')) {
            trelloClone.handleDragStart(e);
        }
    });
    
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('card')) {
            e.target.classList.remove('dragging');
            trelloClone.currentDragging = null;
        }
    });

    // Click em cards para abrir detalhes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.card')) {
            const card = e.target.closest('.card');
            const boardIndex = parseInt(card.dataset.boardIndex);
            const cardIndex = parseInt(card.dataset.cardIndex);
            const cardData = trelloClone.boards[boardIndex].cards[cardIndex];
            trelloClone.showCardDetail(cardData, boardIndex, cardIndex);
        }
    });

    // Botões de ação nos modais de detalhes
    document.addEventListener('click', (e) => {
        if (e.target.id === 'deleteCardBtn') {
            trelloClone.deleteCard();
        }
        if (e.target.id === 'editCardLabelBtn') {
            // Implementar edição de label
            alert('Edição de label em desenvolvimento');
        }
        if (e.target.id === 'editCardDateBtn') {
            // Implementar edição de data
            alert('Edição de data em desenvolvimento');
        }
    });
});

let trelloClone;
