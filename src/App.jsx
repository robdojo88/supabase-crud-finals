import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './App.css';

function App() {
    const [session, setSession] = useState(null);
    const [email, setEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [todoList, setTodoList] = useState([]);
    const [newTodo, setNewTodo] = useState('');

    // -------- Auth: get session and listen for changes ----------
    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } = {} }) => {
            if (!mounted) return;
            setSession(session);
        });

        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        return () => {
            mounted = false;
            subscription?.unsubscribe?.();
        };
    }, []);

    // -------- Fetch todos + subscribe realtime ----------
    useEffect(() => {
        if (!session?.user?.id) {
            setTodoList([]);
            return;
        }

        let isMounted = true;
        const userId = session.user.id;

        const fetchTodos = async () => {
            const { data, error } = await supabase
                .from('TodoList')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) console.error('Error fetching todos:', error);
            else if (isMounted) setTodoList(data ?? []);
        };

        fetchTodos();

        const channel = supabase
            .channel('todos-' + userId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'TodoList',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const { eventType } = payload;
                    if (eventType === 'INSERT')
                        setTodoList((prev) => [...prev, payload.new]);
                    if (eventType === 'UPDATE')
                        setTodoList((prev) =>
                            prev.map((t) =>
                                t.id === payload.new.id ? payload.new : t
                            )
                        );
                    if (eventType === 'DELETE')
                        setTodoList((prev) =>
                            prev.filter((t) => t.id !== payload.old.id)
                        );
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            channel.unsubscribe();
        };
    }, [session]);

    // -------- Auth helpers ----------
    const signUpWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };

    const signInWithEmail = async () => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) console.error('Error sending OTP:', error.message);
        else setOtpSent(true);
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Sign-out error:', error.message);
    };

    // -------- Todo CRUD ----------
    const addTodo = async () => {
        if (!newTodo || !session?.user?.id) return;
        const newTodoData = {
            name: newTodo,
            isCompleted: false,
            user_id: session.user.id,
        };

        const { data, error } = await supabase
            .from('TodoList')
            .insert([newTodoData])
            .select()
            .single();
        if (error) console.error('Error adding todo:', error);
        else setTodoList((prev) => [...prev, data]);

        setNewTodo('');
    };

    const completeTask = async (id, isCompleted) => {
        if (!session?.user?.id) return;
        const { error } = await supabase
            .from('TodoList')
            .update({ isCompleted: !isCompleted })
            .match({ id, user_id: session.user.id });
        if (error) console.error('Error toggling task:', error);

        setTodoList((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, isCompleted: !isCompleted } : t
            )
        );
    };

    const deleteTask = async (id) => {
        if (!session?.user?.id) return;
        const { error } = await supabase
            .from('TodoList')
            .delete()
            .match({ id, user_id: session.user.id });
        if (error) console.error('Error deleting task:', error);

        setTodoList((prev) => prev.filter((t) => t.id !== id));
    };

    // -------- UI ----------
    if (!session) {
        return (
            <div className='flex flex-col gap-4 items-center mt-10'>
                <button onClick={signUpWithGoogle} className='btn btn-primary'>
                    Sign in with Google
                </button>
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
    }

    return (
        <>
            <div className='flex flex-col items-center mt-10 gap-2'>
                <img
                    src={session?.user?.user_metadata?.avatar_url}
                    alt='profile'
                    className='w-20 h-20 rounded-full'
                />
                <p>
                    {session?.user?.user_metadata?.full_name ??
                        session?.user?.email}
                </p>
                <p>{session?.user?.email}</p>
                <button onClick={signOut} className='btn btn-error'>
                    Sign out
                </button>
            </div>

            <div className='text-center'>
                <h1 className='text-6xl py-10 bg-amber-900'>Todo List</h1>
                <div className='md:mt-10 md:py-5 w-full md:flex md:justify-center md:items-center p-4'>
                    <input
                        className='border rounded-sm p-3 md:mx-3 my-2 md:my-0 md:w-7/12 w-full block'
                        type='text'
                        placeholder='New Todo...'
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                    />
                    <input
                        onClick={addTodo}
                        type='submit'
                        value='Add Todo Items'
                        className='btn bg-amber-700 block mb-6 md:mb-0 w-full md:w-auto'
                        disabled={!newTodo}
                    />
                </div>

                <ul className='w-full md:w-8/12 justify-self-center p-3'>
                    {todoList.map((todo) => (
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
                                        completeTask(todo.id, todo.isCompleted)
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
                                        completeTask(todo.id, todo.isCompleted)
                                    }
                                    type='button'
                                    value={todo.isCompleted ? '🔁' : '✅'}
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
                    ))}
                </ul>
            </div>
        </>
    );
}

export default App;
