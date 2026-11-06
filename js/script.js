		// === GLOBAL VARIABLES ===
		let currentMessageIndex = 0
		let currentQuestionIndex = 0
		let isTyping = false
		let timer = null
		let timeLeft = CONFIG.timerDuration
		let userScrolledManually = false
		let lastScrollPosition = 0
		let notificationTimeout = null
		// === DOM ELEMENTS ===
		const elements = {
			splashScreen: document.getElementById('splashScreen'),
			header: document.getElementById('header'),
			chatContainer: document.getElementById('chatContainer'),
			messagesContainer: document.getElementById('messagesContainer'),
			currentTime: document.getElementById('currentTime'),
			wheelSection: document.getElementById('wheelSection'),
			wheelImage: document.getElementById('wheelImage'),
			spinButton: document.getElementById('spinButton'),
			wheelPopup: document.getElementById('wheelPopup'),
			popupClose: document.getElementById('popupClose'),
			popupOk: document.getElementById('popupOk'),
			orderForm: document.getElementById('orderForm'),
			hoursDisplay: document.getElementById('hoursDisplay'),
			minutesDisplay: document.getElementById('minutesDisplay'),
			secondsDisplay: document.getElementById('secondsDisplay'),
			scrollButton: document.getElementById('scrollButton'),
			progressContainer: document.getElementById('progressContainer'),
			progressFill: document.getElementById('progressFill'),
			notification: document.getElementById('notification'),
			notificationText: document.getElementById('notificationText'),
		}
		// === UTILITY FUNCTIONS ===
		function getCurrentTime() {
			const now = new Date()
			const hours = String(now.getHours()).padStart(2, '0')
			const minutes = String(now.getMinutes()).padStart(2, '0')
			return `${VARS.today}, ${hours}:${minutes}`
		}
		function updateProgress() {
			const questions = MESSAGES.filter(msg => msg.choices)
			const progress = Math.min((currentQuestionIndex / questions.length) * 100, 100)
			elements.progressFill.style.width = `${progress}%`
			if (progress > 0 && progress < 100) {
				showProgressBar()
			} else if (progress >= 100) {
				showProgressBar()
				setTimeout(() => {
					hideProgressBar(true)
				}, 2000)
			} else {
				hideProgressBar()
			}
		}
		function showProgressBar() {
			elements.progressContainer.classList.remove('hidden')
			elements.progressContainer.classList.add('show')
		}
		function hideProgressBar(resetWidth = false) {
			elements.progressContainer.classList.remove('show')
			elements.progressContainer.classList.add('hidden')
			if (resetWidth) {
				elements.progressFill.style.width = '0%'
			}
		}
		function showNotification(text, duration = 3000) {
			elements.notificationText.textContent = text
			elements.notification.classList.add('show')
			if (notificationTimeout) {
				clearTimeout(notificationTimeout)
			}
			notificationTimeout = setTimeout(() => {
				elements.notification.classList.remove('show')
			}, duration)
		}
		function addTypingIndicator() {
			const typingDiv = document.createElement('div')
			typingDiv.className = 'typing-indicator'
			typingDiv.id = 'typingIndicator'
			typingDiv.innerHTML = `
					<div class="message-avatar">
						<img src="images/doc.jpg" alt="${VARS.docName}" loading="lazy">
					</div>
					<div class="typing-dots">
						<div class="typing-dot"></div>
						<div class="typing-dot"></div>
						<div class="typing-dot"></div>
					</div>
		`
			elements.messagesContainer.appendChild(typingDiv)
			scrollToBottom()
		}
		function removeTypingIndicator() {
			const typingIndicator = document.getElementById('typingIndicator')
			if (typingIndicator) {
				typingIndicator.remove()
			}
		}
		function scrollToBottom(force = false) {
			if (!userScrolledManually || force) {
				requestAnimationFrame(() => {
					elements.chatContainer.scrollTo({
						top: elements.chatContainer.scrollHeight,
						behavior: 'smooth',
					})
				})
			}
		}
		function checkUserScroll() {
			const {
				scrollTop,
				scrollHeight,
				clientHeight
			} = elements.chatContainer
			const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50
			if (!isAtBottom && scrollTop < lastScrollPosition) {
				userScrolledManually = true
			}
			if (isAtBottom) {
				userScrolledManually = false
			}
			lastScrollPosition = scrollTop
		}
		function updateScrollButton() {
			const {
				scrollTop,
				scrollHeight,
				clientHeight
			} = elements.chatContainer
			const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
			if (isNearBottom || elements.orderForm.classList.contains('show')) {
				elements.scrollButton.classList.remove('show')
			} else {
				elements.scrollButton.classList.add('show')
			}
		}
		function updateHeaderScroll() {
			const scrolled = elements.chatContainer.scrollTop > 50
			elements.header.classList.toggle('scrolled', scrolled)
		}
		function createMessageElement(message, isUser = false) {
			const messageDiv = document.createElement('div')
			messageDiv.className = `message ${isUser ? 'user' : 'doctor'}`
			if (isUser) {
				messageDiv.innerHTML = `
						<div class="message-content">
							<div class="message-bubble user">
								<div class="text">${message}</div>
							</div>
							<div class="message-time">${getCurrentTime()}</div>
						</div>
					`
			} else {
				messageDiv.innerHTML = `
						<div class="message-avatar">
							<img src="images/doc.jpg" alt="${VARS.docName}" loading="lazy">
						</div>
						<div class="message-content">
							<div class="doctor-name">${VARS.docName}</div>
							<div class="message-bubble doctor">
								<div class="text" id="message-${currentMessageIndex}"></div>
							</div>
							<div class="message-time">${getCurrentTime()}</div>
						</div>
					`
			}
			return messageDiv
		}
		function createChoiceButtons(choices) {
			const buttonsContainer = document.createElement('div')
			buttonsContainer.className = 'choice-buttons'
			showProgressBar()
			choices.forEach((choice, index) => {
				const button = document.createElement('button')
				button.className = 'choice-button'
				button.textContent = choice
				button.style.animationDelay = `${index * 0.1}s`
				button.addEventListener('click', evt => handleChoiceClick(choice, buttonsContainer, evt))
				buttonsContainer.appendChild(button)
			})
			return buttonsContainer
		}
		function handleChoiceClick(choice, buttonsContainer, event) {
			// Блокируем все кнопки
			buttonsContainer.querySelectorAll('.choice-button').forEach(btn => {
				btn.disabled = true
				btn.style.opacity = '0.7'
			})
			// Подсвечиваем выбранную кнопку
			event.target.style.background =
				'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(14, 165, 233, 0.95) 100%)'
			event.target.style.transform = 'scale(1.05)'
			// Добавляем пользовательское сообщение
			setTimeout(() => {
				const userMessage = createMessageElement(choice, true)
				elements.messagesContainer.appendChild(userMessage)
				// Удаляем кнопки
				buttonsContainer.remove()
				// Обновляем прогресс
				currentQuestionIndex++
				updateProgress()
				// Показываем уведомление
				if (currentQuestionIndex === 1) {
					showNotification(VARS.MSGS.currentQuestion)
				}
				// Продолжаем с следующим сообщением
				setTimeout(() => {
					currentMessageIndex++
					processNextMessage()
				}, 800)
				scrollToBottom(true)
			}, 300)
		}
		async function typeMessage(text, elementId) {
			return new Promise(resolve => {
				const element = document.getElementById(elementId)
				if (!element) {
					resolve()
					return
				}
				let index = 0
				isTyping = true
				const typeInterval = setInterval(() => {
					if (index < text.length) {
						element.innerHTML = text.slice(0, index + 1)
						index++
						if (currentMessageIndex > 2) {
							scrollToBottom()
						}
					} else {
						clearInterval(typeInterval)
						isTyping = false
						resolve()
					}
				}, CONFIG.typingSpeed)
			})
		}
		async function processNextMessage() {
			if (currentMessageIndex >= MESSAGES.length) return
			const message = MESSAGES[currentMessageIndex]
			// Показываем индикатор печатания
			addTypingIndicator()
			// Небольшая пауза для реалистичности
			await new Promise(resolve => setTimeout(resolve, 1000))
			// Убираем индикатор печатания
			removeTypingIndicator()
			// Создаем элемент сообщения
			const messageElement = createMessageElement()
			elements.messagesContainer.appendChild(messageElement)
			// Печатаем текст
			await typeMessage(message.text, `message-${currentMessageIndex}`)
			// Обрабатываем специальные случаи
			if (message.choices) {
				const choiceButtons = createChoiceButtons(message.choices)
				elements.messagesContainer.appendChild(choiceButtons)
				setTimeout(() => {
					choiceButtons.lastElementChild.scrollIntoView({
						behavior: 'smooth',
						block: 'end',
					})
				}, 200)
				return
			}
			if (message.showWheel) {
				elements.wheelSection.classList.remove('hidden')
				scrollToBottom(true)
				showNotification(VARS.MSGS.wheelSection, 5000)
				return
			}
			// Продолжаем с следующим сообщением
			setTimeout(() => {
				currentMessageIndex++
				processNextMessage()
			}, CONFIG.messageDelay)
			if (currentMessageIndex > 2) {
				scrollToBottom()
			}
		}
		function spinWheel() {
			elements.spinButton.disabled = true
			elements.spinButton.textContent = VARS.TXTS.spinButton
			elements.spinButton.style.opacity = '0.7'
			// Звук
			try {
				const audio = new Audio(
					'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBzeS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBzeS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBzeS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBzeS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBzuO',
				)
				audio.play().catch(() => { })
			} catch (e) { }
			// 🎯 Обертаємо саме проценти
			if (elements.sectorsWrapper) {
				elements.sectorsWrapper.style.transition = 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)'
				elements.sectorsWrapper.style.transform = 'rotate(0deg)' // reset
				void elements.sectorsWrapper.offsetWidth // reflow
				const totalRotation = 360 * 3 // 3 оберти + сектор 50%
				elements.sectorsWrapper.style.transform = `rotate(${totalRotation}deg)`
			}
			// Показуємо попап після завершення
			setTimeout(() => {
				elements.wheelPopup.classList.add('show')
				showNotification(VARS.MSGS.wheelPopup)
			}, 4000)
		}
		function closeWheelPopup() {
			elements.wheelPopup.classList.remove('show')
			elements.wheelSection.classList.add('hidden')
			elements.orderForm.classList.add('show')
			startTimer()
			// Принудительно скроллим к форме
			setTimeout(() => {
				elements.chatContainer.scrollTo({
					top: elements.chatContainer.scrollHeight,
					behavior: 'smooth',
				})
				showNotification(VARS.MSGS.chatContainer, 5000)
			}, 500)
		}
		// === ТАЙМЕР ===
		function startTimer() {
			timer = setInterval(() => {
				timeLeft--
				const hours = Math.floor(timeLeft / 3600)
				const minutes = Math.floor((timeLeft % 3600) / 60)
				const seconds = timeLeft % 60
				elements.hoursDisplay.textContent = String(hours).padStart(2, '0')
				elements.minutesDisplay.textContent = String(minutes).padStart(2, '0')
				elements.secondsDisplay.textContent = String(seconds).padStart(2, '0')
				// Добавляем анимацию при смене секунд
				elements.secondsDisplay.style.animation = 'numberFlip 0.5s ease'
				setTimeout(() => {
					elements.secondsDisplay.style.animation = ''
				}, 500)
				// Предупреждения о времени
				if (timeLeft === 300) {
					showNotification(VARS.MSGS.timeLeft.fiveMin)
				} else if (timeLeft === 60) {
					showNotification(VARS.MSGS.timeLeft.oneMin)
				}
				if (timeLeft <= 0) {
					clearInterval(timer)
					elements.hoursDisplay.textContent = '00'
					elements.minutesDisplay.textContent = '00'
					elements.secondsDisplay.textContent = '00'
					showNotification(VARS.MSGS.timeLeft.end)
				}
			}, 1000)
		}
		// === FORM VALIDATION ===
		function validateForm(formData) {
			const name = formData.get('name').trim()
			const phone = formData.get('phone').trim()
			if (!name || name.length < 2) {
				showNotification(VARS.MSGS.validateForm.name)
				return false
			}
			if (!phone || phone.length < 8) {
				showNotification(VARS.MSGS.validateForm.phone)
				return false
			}
			return true
		}
		// === LAZY LOADING ===
		function setupLazyLoading() {
			if ('IntersectionObserver' in window) {
				const imageObserver = new IntersectionObserver(
					(entries, observer) => {
						entries.forEach(entry => {
							if (entry.isIntersecting) {
								const img = entry.target
								if (img.dataset.src) {
									img.src = img.dataset.src
									img.removeAttribute('data-src')
								}
								img.classList.add('fade-in')
								observer.unobserve(img)
							}
						})
					}, {
					rootMargin: '50px',
				},
				)
				document.querySelectorAll('img[loading="lazy"]').forEach(img => {
					imageObserver.observe(img)
				})
			}
		}
		// === EVENT LISTENERS ===
		function setupEventListeners() {
			// Рулетка
			elements.spinButton.addEventListener('click', spinWheel)
			elements.popupClose.addEventListener('click', closeWheelPopup)
			elements.popupOk.addEventListener('click', closeWheelPopup)
			// Скролл кнопка
			elements.scrollButton.addEventListener('click', () => {
				elements.chatContainer.scrollTo({
					top: elements.chatContainer.scrollHeight,
					behavior: 'smooth',
				})
			})
			// Скролл чата
			let scrollTimeout
			elements.chatContainer.addEventListener('scroll', () => {
				clearTimeout(scrollTimeout)
				scrollTimeout = setTimeout(() => {
					checkUserScroll()
					updateScrollButton()
					updateHeaderScroll()
				}, 16) // ~60fps
			})
			// Валидация формы
			document.getElementById('orderFormElement').addEventListener('submit', function (e) {
				const formData = new FormData(this)
				if (!validateForm(formData)) {
					e.preventDefault()
					return
				}
				showNotification(VARS.MSGS.validateForm.submit)
				// Отключаем кнопку после отправки
				const submitBtn = this.querySelector('.submit-button-new')
				submitBtn.disabled = true
				submitBtn.textContent = VARS.TXTS.submitBtn
				submitBtn.style.background = 'var(--success-gradient)'
			})
			// Улучшенная валидация в реальном времени
			const inputs = document.querySelectorAll('.form-input-new')
			inputs.forEach(input => {
				input.addEventListener('input', function () {
					const isValid = this.value.trim().length > 0
					this.style.borderColor = isValid ? 'var(--accent-color)' : ''
				})
				input.addEventListener('focus', function () {
					this.style.transform = 'translateY(-2px)'
				})
				input.addEventListener('blur', function () {
					this.style.transform = ''
				})
			})
			// Закрытие уведомлений по клику
			elements.notification.addEventListener('click', () => {
				elements.notification.classList.remove('show')
				if (notificationTimeout) {
					clearTimeout(notificationTimeout)
				}
			})
			// Предотвращение случайного ухода со страницы
			// window.addEventListener('beforeunload', (e) => {
			//    if (elements.orderForm.classList.contains('show') && timeLeft > 0) {
			//        e.preventDefault();
			//        e.returnValue = '';
			//         return '';
			//     }
			// });
			// Обработка изменения видимости вкладки
			document.addEventListener('visibilitychange', () => {
				if (document.hidden) {
					if (timer) {
						clearInterval(timer)
					}
				} else {
					if (elements.orderForm.classList.contains('show') && timeLeft > 0) {
						startTimer()
					}
				}
			})
			// Keyboard shortcuts
			document.addEventListener('keydown', e => {
				// ESC - закрыть попап
				if (e.key === 'Escape' && elements.wheelPopup.classList.contains('show')) {
					closeWheelPopup()
				}
				// Space - скролл вниз
				if (e.key === ' ' && !elements.orderForm.classList.contains('show')) {
					e.preventDefault()
					elements.chatContainer.scrollBy({
						top: 200,
						behavior: 'smooth',
					})
				}
			})
		}
		// === PERFORMANCE OPTIMIZATIONS ===
		function optimizePerformance() {
			// Виртуализация сообщений для больших чатов
			const messages = elements.messagesContainer.children
			if (messages.length > 50) {
				for (let i = 0; i < messages.length - 30; i++) {
					if (messages[i]) {
						messages[i].style.display = 'none'
					}
				}
			}
			// Throttle scroll events
			let ticking = false
			const throttledScroll = () => {
				if (!ticking) {
					requestAnimationFrame(() => {
						updateScrollButton()
						updateHeaderScroll()
						ticking = false
					})
					ticking = true
				}
			}
			elements.chatContainer.addEventListener('scroll', throttledScroll, {
				passive: true,
			})
			// Предзагрузка критических ресурсов
			const criticalImages = ['images/doc.jpg', 'images/prod.png']
			criticalImages.forEach(src => {
				const img = new Image()
				img.src = src
			})
		}
		// === ACCESSIBILITY IMPROVEMENTS ===
		function improveAccessibility() {
			// Добавляем aria-labels
			elements.spinButton.setAttribute('aria-label', VARS.LABELS.spinButton)
			elements.scrollButton.setAttribute('aria-label', VARS.LABELS.scrollButton)
			elements.popupClose.setAttribute('aria-label', VARS.LABELS.popupClose)
			// Улучшаем навигацию с клавиатуры
			const focusableElements = document.querySelectorAll(
				'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
			)
			focusableElements.forEach(el => {
				el.addEventListener('focus', function () {
					this.style.outline = '2px solid var(--accent-color)'
					this.style.outlineOffset = '2px'
				})
				el.addEventListener('blur', function () {
					this.style.outline = ''
					this.style.outlineOffset = ''
				})
			})
			// Объявления для скрин-ридеров
			const announcements = document.createElement('div')
			announcements.setAttribute('aria-live', 'polite')
			announcements.setAttribute('aria-atomic', 'true')
			announcements.className = 'sr-only'
			announcements.style.position = 'absolute'
			announcements.style.left = '-10000px'
			announcements.style.width = '1px'
			announcements.style.height = '1px'
			announcements.style.overflow = 'hidden'
			document.body.appendChild(announcements)
			window.announceToScreenReader = text => {
				announcements.textContent = text
			}
		}
		// === ADVANCED FEATURES ===
		function addAdvancedFeatures() {
			// Детекция бездействия пользователя
			let idleTimer
			const resetIdleTimer = () => {
				clearTimeout(idleTimer)
				idleTimer = setTimeout(() => {
					if (!elements.orderForm.classList.contains('show')) {
						showNotification(VARS.MSGS.idleTimer, 4000)
					}
				}, 60000) // 1 минута бездействия
			};
			['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
				document.addEventListener(event, resetIdleTimer, {
					passive: true,
				})
			})
			// Система достижений
			const achievements = {
				firstChoice: false,
				allQuestions: false,
				wheelSpin: false,
				formFilled: false,
			}
			window.unlockAchievement = achievement => {
				if (!achievements[achievement]) {
					achievements[achievement] = true
					const messages = VARS.achievements
					showNotification(messages[achievement], 3000)
				}
			}
			// Сохранение прогресса в sessionStorage (осторожно с ограничениями Claude.ai)
			const saveProgress = () => {
				try {
					const progress = {
						messageIndex: currentMessageIndex,
						questionIndex: currentQuestionIndex,
						achievements: achievements,
					}
					// Вместо sessionStorage используем переменную в памяти
					window.chatProgress = progress
				} catch (e) {
					console.log('Progress saving not available')
				}
			}
			// Автосохранение каждые 10 секунд
			setInterval(saveProgress, 10000)
		}
		// === SOCIAL PROOF ===
		function addSocialProof() {
			const socialProofMessages = VARS.MSGS.socialProof
			let socialIndex = 0
			const showSocialProof = () => {
				if (!elements.orderForm.classList.contains('show')) {
					showNotification(`👥 ${socialProofMessages[socialIndex % socialProofMessages.length]}`, 4000)
					socialIndex++
				}
			}
			// Показываем социальные доказательства каждые 45 секунд
			setInterval(showSocialProof, 45000)
		}
		// === WHEEL ANIMATION IMPROVEMENTS ===
		function enhanceWheelAnimation() {
			if (!elements.wheelImage) return
			// 🎨 Градієнт рулетки
			const wheelGradient = `conic-gradient(
				from -18deg,
				#b92f48 0deg 45deg,
				#e7f3ff 45deg 90deg,
				#8f253e 90deg 135deg,
				#f5e6bb 135deg 180deg,
				#b92f48 180deg 225deg,
				#d3e8fb 225deg 270deg,
				#8f253e 270deg 315deg,
				#fff5dc 315deg 360deg
			)`
			elements.wheelImage.style.background = wheelGradient
			elements.wheelImage.style.border = '10px solid rgba(255, 255, 255, 0.85)'
			elements.wheelImage.style.boxShadow =
				'0 24px 70px rgba(55, 82, 125, 0.22), inset 0 0 40px rgba(255, 255, 255, 0.4)'
			// 🌀 Створюємо обгортку для секторів
			const sectorsWrapper = document.createElement('div')
			sectorsWrapper.className = 'sectors-wrapper'
			elements.sectorsWrapper = sectorsWrapper // 👈 зберігаємо посилання, щоб потім обертати
			// 🧩 Додаємо сектори з текстом
			const sectors = CONFIG.sectors
			sectors.forEach((text, index) => {
				const sector = document.createElement('div')
				sector.style.position = 'absolute'
				sector.style.top = '50%'
				sector.style.left = '50%'
				sector.style.transform = `translate(-50%, -50%) rotate(${index * 45}deg) translateY(-108px)`
				sector.style.color = '#263e60'
				sector.style.fontWeight = '600'
				sector.style.fontSize = '15px'
				sector.style.textShadow = '0 1px 3px rgba(255, 255, 255, 0.6)'
				sector.style.pointerEvents = 'none'
				sector.textContent = text
				sectorsWrapper.appendChild(sector)
			})
			// 📍 Указівник
			const pointer = document.createElement('div')
			pointer.style.position = 'absolute'
			pointer.style.top = '18px'
			pointer.style.left = '50%'
			pointer.style.transform = 'translateX(-50%)'
			pointer.style.width = '0'
			pointer.style.height = '0'
			pointer.style.borderLeft = '15px solid transparent'
			pointer.style.borderRight = '15px solid transparent'
			pointer.style.borderTop = '25px solid rgba(67, 89, 75, 0.85)'
			pointer.style.zIndex = '5'
			pointer.style.filter = 'drop-shadow(0 4px 10px rgba(36, 49, 41, 0.35))'
			const wheelContainer = elements.wheelImage.parentElement
			wheelContainer.appendChild(sectorsWrapper)
			wheelContainer.appendChild(pointer)
		}
		// === MAIN INITIALIZATION ===
		function init() {
			// Устанавливаем текущее время
			elements.currentTime.textContent = getCurrentTime()
			// Убеждаемся что скролл в самом верху
			elements.chatContainer.scrollTop = 0
			// Настройка компонентов
			setupEventListeners()
			setupLazyLoading()
			optimizePerformance()
			improveAccessibility()
			addAdvancedFeatures()
			addSocialProof()
			enhanceWheelAnimation()
			// Скрываем заставку через 2.5 секунды
			setTimeout(() => {
				elements.splashScreen.classList.add('hidden')
				// Приветственное уведомление
				setTimeout(() => {
					showNotification(VARS.MSGS.welcome, 4000)
				}, 500)
				// Начинаем чат после короткой задержки
				setTimeout(() => {
					processNextMessage()
				}, 1000)
			}, 2500)
			// Обновляем время каждую минуту
			setInterval(() => {
				elements.currentTime.textContent = getCurrentTime()
			}, 60000)
		}
		// === ЗАПУСК ===
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init)
		} else {
			init()
		}
		// === CLEANUP ===
		window.addEventListener('beforeunload', () => {
			if (timer) clearInterval(timer)
			if (notificationTimeout) clearTimeout(notificationTimeout)
		})
		// === EXPORTS FOR TESTING ===
		window.chatBot = {
			showNotification,
			updateProgress,
			spinWheel,
			closeWheelPopup,
			getCurrentTime,
			scrollToBottom,
}
        
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("snowContainer");

  if (!container) {
    console.error("Snow container not found!");
    return;
  }

  const count = window.innerWidth <= 768 ? 20 : 50;

  for (let i = 0; i < count; i++) {
    const snowflake = document.createElement("span");

    snowflake.className = "snowflake";
    snowflake.textContent = "❄";

    snowflake.style.left = `${Math.random() * 100}%`;
    snowflake.style.fontSize = `${Math.random() * 15 + 10}px`;
    snowflake.style.opacity = `${Math.random() * 0.6 + 0.3}`;
    snowflake.style.animationDuration = `${Math.random() * 8 + 5}s`;
    snowflake.style.animationDelay = `${Math.random() * -15}s`;

    container.appendChild(snowflake);
  }
});