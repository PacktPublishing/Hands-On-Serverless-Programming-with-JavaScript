// Full spec-compliant TodoMVC with localStorage persistence
// and hash-based routing in ~150 lines.
import env from './env.js'
import Vue from './vue.min.js'
// localStorage persistence
const URL = env.API_URL

import axios from 'axios'

const STORAGE_KEY = 'todos-vuejs-2.0'

async function makeRequest(params) {
  const {
    data: {
      data
    }
  } = await axios.post(
    URL, params
  )
  return data
}
const todoService = {
  async fetch() {

    const {
      find
    } = await makeRequest({
      query: `
    query {
      find {
        _id,
        text,
        createdAt,
        visibility
      }
    }
    `
    })
    const todo = find.map(({
      _id,
      text,
      visibility
    }) => {
      return {
        title: text,
        id: _id,
        completed: visibility
      }
    })

    return todo


  },

  async delete(id) {
    const r = await makeRequest({
      query: `
        mutation deleteTodo($_id: String!) {
          delete(_id: $_id) 
        }`,
      variables: {
        _id: id
      }
    })
    return r
  },

  async create(params) {
    const {
      create
    } = await makeRequest({
      query: `
        mutation createTodo($text: String!, $visibility: Boolean!) {
          create(text: $text, visibility: $visibility) 
        }`,
      variables: params
    })
    return create
  },

  async update(id, params) {
    const {
      update
    } = await makeRequest({
      query: `
        mutation updateTodo($_id: String!, $text: String, $visibility: Boolean) {
          update(_id: $_id, text: $text, visibility: $visibility) 
        }`,
      variables: {
        _id: id,
        ...params
      }
    })
    return update
  },

  updateCache: function (todos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  },
  fetchCache () {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")

  }
}

// visibility filters
const filters = {
  all: function (todos) {
    return todos
  },
  active: function (todos) {
    return todos.filter(function (todo) {
      return !todo.completed
    })
  },
  completed: function (todos) {
    return todos.filter(function (todo) {
      return todo.completed
    })
  }
}

// app Vue instance
const app = new Vue({
  // app initial state
  data: {
    todos: todoService.fetchCache(),
    newTodo: '',
    editedTodo: null,
    visibility: 'all'
  },

  // watch todos change for localStorage persistence
  watch: {
    todos: {
      handler: function (todos) {
        todoService.updateCache(todos)
      },
      deep: true
    }
  },
  async mounted() {
    this.todos = await todoService.fetch()
  },
  // computed properties
  // https://vuejs.org/guide/computed.html
  computed: {
    filteredTodos: function () {
      return filters[this.visibility](this.todos)
    },
    remaining: function () {
      return filters.active(this.todos).length
    },
    allDone: {
      get: function () {
        return this.remaining === 0
      },
      set: function (value) {
        this.todos.forEach(function (todo) {
          todo.completed = value
        })
      }
    }
  },

  filters: {
    pluralize: function (n) {
      return n === 1 ? 'item' : 'items'
    }
  },

  // methods that implement data logic.
  // note there's no DOM manipulation here at all.
  methods: {
    addTodo() {
      const value = this.newTodo && this.newTodo.trim()
      if (!value) return

      const tempId = Date.now()
      const tempTodo = {
        id: tempId,
        title: value,
        completed: false
      }

      this.todos.push(tempTodo)
      this.newTodo = ''

      todoService.create({
        text: tempTodo.title,
        visibility: tempTodo.completed
      })

    },

    removeTodo(todo) {
      this.todos.splice(this.todos.indexOf(todo), 1)
      todoService.delete(todo.id)
    },

    editTodo(todo) {
      this.beforeEditCache = todo.title
      this.editedTodo = todo
    },

    doneEdit(todo) {
      if (!this.editedTodo) return

      this.editedTodo = null
      todo.title = todo.title.trim()
      if (!todo.title) {
        this.removeTodo(todo)
        todoService.delete(todo.id)
        return;
      }
      todoService.update(todo.id, {
        text: todo.title
      })
    },
    completeTodo(todo) {
      todoService.update(todo.id, {
        visibility: todo.completed
      })
    },
    cancelEdit(todo) {
      this.editedTodo = null
      todo.title = this.beforeEditCache
    },

    removeCompleted() {
      this.todos = filters.active(this.todos)
    }
  },

  // a custom directive to wait for the DOM to be updated
  // before focusing on the input field.
  // https://vuejs.org/guide/custom-directive.html
  directives: {
    'todo-focus': function (el, binding) {
      if (binding.value) {
        el.focus()
      }
    }
  }
})

// handle routing
function onHashChange() {
  const visibility = window.location.hash.replace(/#\/?/, '')
  if (filters[visibility]) {
    app.visibility = visibility
  } else {
    window.location.hash = ''
    app.visibility = 'all'
  }
}

window.addEventListener('hashchange', onHashChange)
onHashChange()

// mount
app.$mount('.todoapp')