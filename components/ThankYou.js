function ThankYou() {
    try {
        return React.createElement('div', {
            className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4',
            'data-name': 'thank-you-container',
            'data-file': 'components/ThankYou.js'
        },
            React.createElement('div', {
                className: 'bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center',
                'data-name': 'thank-you-card',
                'data-file': 'components/ThankYou.js'
            },
                React.createElement('div', {
                    className: 'icon-heart text-6xl text-red-500 mb-6'
                }),
                React.createElement('h1', {
                    className: 'text-3xl font-bold text-gray-900 mb-4'
                }, 'Thank you for your response!'),
                React.createElement('p', {
                    className: 'text-gray-600 mb-6'
                }, 'We appreciate you taking the time to respond to the invitation.'),
                React.createElement('div', {
                    className: 'bg-blue-50 rounded-lg p-4 mb-6'
                },
                    React.createElement('p', {
                        className: 'text-blue-800 font-medium mb-2'
                    }, 'Join Our Platform'),
                    React.createElement('p', {
                        className: 'text-blue-600 text-sm mb-4'
                    }, 'We\'d love to have you on our platform to discover amazing events and vendors.')
                ),
                React.createElement('div', {
                    className: 'space-y-3'
                },
                    React.createElement('a', {
                        href: '#/signup',
                        className: 'w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors inline-block'
                    }, 'Create an Account'),
                    React.createElement('a', {
                        href: '#/',
                        className: 'w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors inline-block'
                    }, 'Browse Events')
                )
            )
        );

    } catch (error) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center'
        }, 'Loading...');
    }
}

window.ThankYou = ThankYou;