// Весь код и привязка обработчиков — внутри window.onload
window.onload = function () {
    // ------------------ КАРТА ЯНДЕКС ------------------

    ymaps.ready(function () {
        // Координаты для адреса Таллинская, 34 (пример)
        var coords = [55.8395, 37.4095];

        var map = new ymaps.Map('map', {
            center: coords,
            zoom: 15,
            controls: ['zoomControl', 'fullscreenControl']
        });

        var placemark = new ymaps.Placemark(coords, {
            balloonContent: 'Таллинская, 34'
        }, {
            preset: 'islands#redIcon'
        });

        map.geoObjects.add(placemark);
    });

    // ------------------ ЧАТ ------------------

    var chatInput = document.getElementById('chat-input');
    var chatSendBtn = document.getElementById('chat-send');
    var chatVoiceBtn = document.getElementById('chat-voice');
    var chatMessages = document.getElementById('chat-messages');

    // Набор ответов с ключевыми словами
    var keywordResponses = [
        {
            keywords: ['привет', 'здравствуй', 'hello', 'hi'],
            answers: [
                'Привет! Я Соня, студентка ВШЭ.',
                'Здравствуйте! Рада, что вы зашли на мою страничку.',
                'Привет! Чем могу помочь?'
            ]
        },
        {
            keywords: ['матем', 'матан', 'алгебр', 'вероятн'],
            answers: [
                'Да, прикладная математика — моя специальность!',
                'Люблю матанализ и линейную алгебру.',
                'Математика помогает решать реальные задачи.'
            ]
        },
        {
            keywords: ['вшэ', 'hse'],
            answers: [
                'ВШЭ — мой университет.',
                'Учусь в ВШЭ на прикладной математике.',
                'ВШЭ даёт много возможностей для развития.'
            ]
        },
        {
            keywords: ['пока', 'до свидан', 'bye'],
            answers: [
                'До встречи!',
                'Буду рада, если вы ещё заглянете на мою страницу.',
                'Пока-пока!'
            ]
        }
    ];

    var defaultAnswers = [
        'Интересный вопрос! Я подумаю над ответом.',
        'Спасибо за сообщение!',
        'Расскажите, что вас интересует: учёба, ВШЭ или математика?',
        'Я — виртуальная Соня, но стараюсь отвечать как можно лучше.'
    ];

    function addMessage(text, sender, options) {
        var div = document.createElement('div');
        div.classList.add('chat-message');
        if (sender === 'user') {
            div.classList.add('user');
        } else {
            div.classList.add('bot');
        }

        if (options && options.voice) {
            div.classList.add('voice');
            div.textContent = text;
            // прикрепляем объект URL для воспроизведения
            div.dataset.audioUrl = options.audioUrl;
            div.addEventListener('click', function () {
                var audio = new Audio(div.dataset.audioUrl);
                audio.play();
            });
        } else {
            div.textContent = text;
        }

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getBotAnswer(userText) {
        var text = userText.toLowerCase();

        for (var i = 0; i < keywordResponses.length; i++) {
            var group = keywordResponses[i];
            for (var j = 0; j < group.keywords.length; j++) {
                if (text.includes(group.keywords[j])) {
                    var ansIndex = Math.floor(Math.random() * group.answers.length);
                    return group.answers[ansIndex];
                }
            }
        }

        var defaultIndex = Math.floor(Math.random() * defaultAnswers.length);
        return defaultAnswers[defaultIndex];
    }

    function sendTextMessage() {
        var text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        setTimeout(function () {
            var answer = getBotAnswer(text);
            addMessage(answer, 'bot');
        }, 500);
    }

    // ------------------ РЕАЛЬНАЯ ЗАПИСЬ ГОЛОСА ------------------

    var mediaRecorder = null;
    var audioChunks = [];
    var isRecording = false;

    var voiceVisualizer = document.getElementById('voice-visualizer');
    var voiceBars = document.querySelectorAll('#voice-visualizer .voice-bar');

    var audioContext = null;
    var analyser = null;
    var sourceNode = null;
    var animationId = null;

    function startVisualizer(stream) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        var dataArray = new Uint8Array(analyser.frequencyBinCount);

        voiceVisualizer.style.display = 'flex';

        function animate() {
            animationId = requestAnimationFrame(animate);
            analyser.getByteTimeDomainData(dataArray);

            // вычисляем простую "амплитуду"
            var sum = 0;
            for (var i = 0; i < dataArray.length; i++) {
                var v = dataArray[i] - 128;
                sum += Math.abs(v);
            }
            var amplitude = sum / dataArray.length; // 0..~50

            // нормализуем в 0..1
            var norm = Math.min(amplitude / 50, 1);

            voiceBars.forEach(function (bar, index) {
                // делаем чуть разную высоту, чтобы было «живее»
                var factor = 0.5 + index / voiceBars.length;
                var h = 4 + norm * 20 * factor; // от 4px до ~24px
                bar.style.height = h + 'px';
            });
        }

        animate();
    }

    function stopVisualizer() {
        voiceVisualizer.style.display = 'none';
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
        if (analyser) {
            analyser.disconnect();
            analyser = null;
        }
        // audioContext оставляем, можно переиспользовать
    }

    function toggleVoiceRecording() {
        if (!isRecording) {
            // Начинаем запись
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function (stream) {
                    audioChunks = [];
                    mediaRecorder = new MediaRecorder(stream);

                    mediaRecorder.addEventListener('dataavailable', function (event) {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener('stop', function () {
                        var blob = new Blob(audioChunks, { type: 'audio/webm' });
                        var audioUrl = URL.createObjectURL(blob);

                        // добавляем сообщение с голосом
                        addMessage('[Голосовое сообщение] ▶ Нажмите, чтобы прослушать', 'user', {
                            voice: true,
                            audioUrl: audioUrl
                        });

                        // останавливаем все дорожки микрофона
                        stream.getTracks().forEach(function (track) {
                            track.stop();
                        });

                        stopVisualizer();
                        chatVoiceBtn.textContent = '🎤 Голос';
                        isRecording = false;
                    });

                    mediaRecorder.start();
                    startVisualizer(stream);
                    chatVoiceBtn.textContent = '■ Стоп';
                    isRecording = true;
                })
                .catch(function (err) {
                    console.error('Ошибка доступа к микрофону:', err);
                    alert('Не удалось получить доступ к микрофону.');
                });
        } else {
            // Останавливаем запись
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        }
    }

    // ------------------ ОБРАБОТЧИКИ СОБЫТИЙ ------------------

    chatSendBtn.addEventListener('click', function () {
        sendTextMessage();
    });

    chatInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendTextMessage();
        }
    });

    chatVoiceBtn.addEventListener('click', function () {
        toggleVoiceRecording();
    });
};
