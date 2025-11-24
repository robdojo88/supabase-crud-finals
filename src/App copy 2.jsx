// import { useState, useEffect } from 'react';
// import { supabase } from '../supabaseClient';
// import './App.css';
// import { Auth } from '@supabase/auth-ui-react';
// import { ThemeSupa } from '@supabase/auth-ui-shared';

// function App() {
//     const [session, setSession] = useState(null);

//     useEffect(() => {
//         supabase.auth.getSession().then(({ data: { session } }) => {
//             setSession(session);
//         });

//         const {
//             data: { subscription },
//         } = supabase.auth.onAuthStateChange((_event, session) => {
//             setSession(session);
//         });

//         return () => subscription.unsubscribe();
//     }, []);

//     if (!session) {
//         return (
//             <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
//         );
//     } else {
//         return <div>Logged in!</div>;
//     }
// }

// export default App;
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './App.css';

function App() {
    const [session, setSession] = useState(null);
    const [email, setEmail] = useState(''); // input for OTP email
    const [otpSent, setOtpSent] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Google OAuth
    const signUpWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    };

    // Email OTP (Magic Link)
    const signInWithEmail = async () => {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
        });
        if (error) {
            console.error('Error sending OTP:', error.message);
        } else {
            setOtpSent(true);
        }
    };

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Sign-out error:', error.message);
    };
    console.log(session);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const [todoList, setTodoList] = useState([]);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        const { data, error } = await supabase
            .from('TodoList')
            .select('*')
            .order('name', { ascending: true }); // A → Z
        if (error) {
            console.log('Error fetching: ', error);
        } else {
            setTodoList(data);
        }
    };

    const addTodo = async () => {
        const newTodoData = {
            name: newTodo,
            isCompleted: false,
        };
        const { data, error } = await supabase
            .from('TodoList')
            .insert([newTodoData])
            .select()
            .single();

        if (error) {
            console.log('Error adding todo ', error);
        } else if (data) {
            setTodoList((prev) => [...prev, data]);
            setNewTodo('');
        }
    };

    const completeTask = async (id, isCompleted) => {
        const { data, error } = await supabase
            .from('TodoList')
            .update({ isCompleted: !isCompleted })
            .eq('id', id);

        if (error) {
            console.log('Error toggling task: ', error);
        } else {
            const updatedToolList = todoList.map((todo) =>
                todo.id === id ? { ...todo, isCompleted: !isCompleted } : todo
            );
            setTodoList(updatedToolList);
        }
    };

    const deleteTask = async (id) => {
        const { data, error } = await supabase
            .from('TodoList')
            .delete()
            .eq('id', id);

        if (error) {
            console.log('Error deleting task: ', error);
        } else {
            setTodoList((prev) => prev.filter((todo) => todo.id !== id));
        }
    };

    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    if (!session) {
        return (
            <div className='flex flex-col gap-4 items-center mt-10'>
                {/* Google sign in */}
                <button onClick={signUpWithGoogle} className='btn btn-primary'>
                    Sign in with Google
                </button>

                {/* Email OTP sign in */}
                <div className='flex flex-col gap-2'>
                    <input
                        type='email'
                        placeholder='Enter your email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='input input-bordered'
                    />
                    <button
                        onClick={signInWithEmail}
                        className='btn btn-secondary'
                    >
                        Send Magic Link
                    </button>
                    {otpSent && <p>✅ Check your email for the login link!</p>}
                </div>
            </div>
        );
    } else {
        return (
            <>
                <div className='flex flex-col items-center mt-10 gap-2'>
                    <img
                        src={session.user.user_metadata.avatar_url}
                        alt='profile'
                        className='w-20 h-20 rounded-full'
                    />
                    <p>{session?.user?.user_metadata?.full_name}</p>
                    <p>{session?.user?.email}</p>
                    <button onClick={signOut} className='btn btn-error'>
                        Sign out
                    </button>
                </div>
                <div className='text-center'>
                    <h1 className='text-6xl py-10 bg-amber-900'>Todo List</h1>
                    <div className='md:mt-10 md:py-5 w-full md:flex md:justify-center md:items-center p-4'>
                        <input
                            className='border rounded-sm p-3 md:mx-3 my-2 md:my-0 md:w-7/12 w-full block '
                            type='text'
                            placeholder='New Todo...'
                            value={newTodo}
                            onChange={(e) => {
                                setNewTodo(e.target.value);
                            }}
                        />
                        <input
                            onClick={addTodo}
                            type='submit'
                            value='Add Todo Items'
                            className='btn bg-amber-700 block mb-6 md:mb-0 w-full md:w-auto'
                            disabled={!newTodo}
                        />
                    </div>
                    <ul className='w-full md:w-8/12 justify-self-center p-3 '>
                        {todoList.map((todo) =>
                            todo ? (
                                <li
                                    key={todo.id}
                                    className='flex text-center justify-evenly mb-1 items-center'
                                >
                                    <p className='w-full md:w-2/3 border text-start py-2 px-3 rounded-sm bg-emerald-100 shadow-md text-black overflow-x-scroll md:overflow-auto h-12'>
                                        {todo.name}
                                    </p>
                                    <div className='hidden md:flex'>
                                        <input
                                            onClick={() =>
                                                completeTask(
                                                    todo.id,
                                                    todo.isCompleted
                                                )
                                            }
                                            type='button'
                                            value={
                                                todo.isCompleted
                                                    ? 'Undo'
                                                    : 'Complete Task'
                                            }
                                            className='btn w-40 mx-2 bg-green-700'
                                        />
                                        <input
                                            onClick={() => deleteTask(todo.id)}
                                            type='submit'
                                            value='Delete Task'
                                            className='btn mx-2'
                                        />
                                    </div>
                                    <div className='md:hidden flex'>
                                        <input
                                            onClick={() =>
                                                completeTask(
                                                    todo.id,
                                                    todo.isCompleted
                                                )
                                            }
                                            type='button'
                                            value={
                                                todo.isCompleted ? '🔁' : '✅'
                                            }
                                            className='btn ml-2'
                                        />
                                        <input
                                            onClick={() => deleteTask(todo.id)}
                                            type='submit'
                                            value='🗑️'
                                            className='btn ml-1'
                                        />
                                    </div>
                                </li>
                            ) : null
                        )}
                    </ul>
                </div>
            </>
        );
    }
}

export default App;
